/**
 * ZEKA: Mind Puzzle - 100% Cloudflare Edge Leaderboard System
 * Powered exclusively by Cloudflare Edge Workers & Cloudflare D1
 */

const CF_WORKER_URL = (import.meta.env.VITE_CF_WORKER_URL || 'https://zeka-edge-api.zekagame.workers.dev').replace(/\/$/, '');

export interface ScoreEntry {
  id: string;
  player_name: string;
  level: number;
  total_time: number;
  created_at: string;
  country?: string;
  country_code?: string;
}

// --- Player Storage Keys ---
const PLAYER_NAME_KEY = 'zeka_player_name';
const PERSONAL_BEST_KEY = 'zeka_personal_best';
const PLAYER_COUNTRY_KEY = 'zeka_player_country';
const DEVICE_ID_KEY = 'zeka_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDuelPlayerId(): string {
  try {
    let id = sessionStorage.getItem('zeka_duel_id');
    if (!id) {
      id = getDeviceId().substring(0, 8) + '_' + Math.random().toString(36).substring(2, 8);
      sessionStorage.setItem('zeka_duel_id', id);
    }
    return id;
  } catch (e) {
    return getDeviceId();
  }
}

export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

export function setPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name.trim().substring(0, 20));
}

export async function fetchAndCacheCountry(): Promise<string> {
  const cached = localStorage.getItem(PLAYER_COUNTRY_KEY);
  if (cached) return cached;
  
  try {
    const res = await fetch(`${CF_WORKER_URL}/api/health`);
    if (res.ok) {
      const data = await res.json();
      if (data.country) {
        localStorage.setItem(PLAYER_COUNTRY_KEY, data.country);
        return data.country;
      }
    }
  } catch (e) {
    // If worker connection is cold, use public IP geo
  }

  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data.country_code) {
      localStorage.setItem(PLAYER_COUNTRY_KEY, data.country_code);
      return data.country_code;
    }
  } catch (e) {
    console.warn('Country detection error', e);
  }
  return 'TR';
}

export function getCachedCountry(): string {
  return localStorage.getItem(PLAYER_COUNTRY_KEY) || 'TR';
}

// --- Personal Best (Local Cache) ---
export interface PersonalBest {
  level: number;
  totalTime: number;
  date: string;
}

export function getPersonalBest(): PersonalBest | null {
  const stored = localStorage.getItem(PERSONAL_BEST_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as PersonalBest;
  } catch {
    return null;
  }
}

export function updatePersonalBest(level: number, totalTime: number): boolean {
  const current = getPersonalBest();
  const isBetter = !current 
    || level > current.level 
    || (level === current.level && totalTime < current.totalTime);
  
  if (isBetter) {
    const best: PersonalBest = {
      level,
      totalTime: Number(totalTime.toFixed(2)),
      date: new Date().toISOString()
    };
    localStorage.setItem(PERSONAL_BEST_KEY, JSON.stringify(best));
  }
  return isBetter;
}

// --- Cloudflare D1 Score Operations ---

export async function isNameTaken(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;

  try {
    const res = await fetch(`${CF_WORKER_URL}/api/check-name?name=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      return !!data.taken;
    }
  } catch (e) {
    console.warn('Cloudflare isNameTaken check failed:', e);
  }
  return false;
}

export async function addScore(playerName: string, level: number, totalTime: number): Promise<ScoreEntry | null> {
  const nameToUse = playerName.trim().substring(0, 15) || 'Anonim';
  const deviceId = getDeviceId();

  try {
    const res = await fetch(`${CF_WORKER_URL}/api/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_name: nameToUse,
        device_id: deviceId,
        level,
        total_time: Number(totalTime.toFixed(2))
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        id: deviceId,
        player_name: nameToUse,
        level,
        total_time: Number(totalTime.toFixed(2)),
        created_at: new Date().toISOString(),
        country: data.country || 'TR',
        country_code: data.country || 'TR'
      };
    }
  } catch (e) {
    console.error('Cloudflare score submission error:', e);
  }

  return null;
}

export async function getDailyScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(`${CF_WORKER_URL}/api/leaderboard?period=daily`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: String(item.id || item.player_name),
          player_name: item.player_name,
          level: Number(item.level),
          total_time: Number(item.total_time),
          created_at: item.created_at || new Date().toISOString(),
          country: item.country || 'TR',
          country_code: item.country || 'TR'
        }));
      }
    }
  } catch (e) {
    console.warn('Cloudflare getDailyScores error:', e);
  }
  return [];
}

export async function getWeeklyScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(`${CF_WORKER_URL}/api/leaderboard?period=weekly`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: String(item.id || item.player_name),
          player_name: item.player_name,
          level: Number(item.level),
          total_time: Number(item.total_time),
          created_at: item.created_at || new Date().toISOString(),
          country: item.country || 'TR',
          country_code: item.country || 'TR'
        }));
      }
    }
  } catch (e) {
    console.warn('Cloudflare getWeeklyScores error:', e);
  }
  return [];
}

export async function getAllTimeScores(): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(`${CF_WORKER_URL}/api/leaderboard?period=alltime`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          id: String(item.id || item.player_name),
          player_name: item.player_name,
          level: Number(item.level),
          total_time: Number(item.total_time),
          created_at: item.created_at || new Date().toISOString(),
          country: item.country || 'TR',
          country_code: item.country || 'TR'
        }));
      }
    }
  } catch (e) {
    console.warn('Cloudflare getAllTimeScores error:', e);
  }
  return [];
}

export async function getPersonalScoreAndRank(
  period: 'daily' | 'weekly' | 'alltime', 
  playerName: string
): Promise<{ rank: number; row: ScoreEntry } | null> {
  const nameToSearch = playerName.trim();
  const deviceId = getDeviceId();

  try {
    const res = await fetch(
      `${CF_WORKER_URL}/api/rank?name=${encodeURIComponent(nameToSearch)}&deviceId=${encodeURIComponent(deviceId)}&period=${period}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.rank && data.row) {
        return {
          rank: Number(data.rank),
          row: {
            id: String(data.row.id || data.row.player_name),
            player_name: data.row.player_name,
            level: Number(data.row.level),
            total_time: Number(data.row.total_time),
            created_at: data.row.created_at,
            country: data.row.country || 'TR',
            country_code: data.row.country || 'TR'
          }
        };
      }
    }
  } catch (e) {
    console.warn('Cloudflare getPersonalScoreAndRank error:', e);
  }

  return null;
}

// --- Formatting Helpers ---

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}m ${secs}s`;
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}`;
}
