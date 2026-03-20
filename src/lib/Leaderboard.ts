// Leaderboard system using Supabase for global scores + localStorage for personal best
import { supabase } from './supabaseClient';

export interface ScoreEntry {
  id: string;
  player_name: string;
  level: number;
  total_time: number;
  created_at: string;
  country_code?: string;
}

// --- Player Info ---
const PLAYER_NAME_KEY = 'zeka_player_name';
const PERSONAL_BEST_KEY = 'zeka_personal_best';
const PLAYER_COUNTRY_KEY = 'zeka_player_country';

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
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (data.country_code) {
      localStorage.setItem(PLAYER_COUNTRY_KEY, data.country_code);
      return data.country_code;
    }
  } catch (e) {
    console.error('Country fetch error', e);
  }
  return '';
}

export function getCachedCountry(): string {
  return localStorage.getItem(PLAYER_COUNTRY_KEY) || '';
}

// --- Personal Best (local) ---
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

// --- Supabase Score Operations ---

export async function isNameTaken(name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scores')
    .select('id')
    .ilike('player_name', name.trim())
    .limit(1);

  if (error) {
    console.error('İsim kontrol hatası:', error);
    return false;
  }
  return data && data.length > 0;
}

export async function addScore(playerName: string, level: number, totalTime: number, oldName?: string): Promise<ScoreEntry | null> {
  const nameToUse = playerName.trim().substring(0, 15) || 'Anonim';
  const nameToUpdate = oldName || nameToUse;
  const countryCode = getCachedCountry();

  const { data: existing } = await supabase
    .from('scores')
    .select('*')
    .ilike('player_name', nameToUpdate)
    .limit(1);

  if (existing && existing.length > 0) {
    const row = existing[0];
    const isBetter = level > row.level || (level === row.level && totalTime < row.total_time);

    const updates: any = {};
    if (nameToUse !== row.player_name) updates.player_name = nameToUse;

    if (isBetter) {
      updates.level = level;
      updates.total_time = Number(totalTime.toFixed(2));
      updates.created_at = new Date().toISOString();
    }
    if (countryCode && countryCode !== row.country_code) {
      updates.country_code = countryCode;
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase.from('scores').update(updates).eq('id', row.id).select().single();
      if (!error && data) return data as ScoreEntry;
    }
    return row as ScoreEntry;
  }

  const { data, error } = await supabase
    .from('scores')
    .insert({
      player_name: nameToUse,
      level,
      total_time: Number(totalTime.toFixed(2)),
      country_code: countryCode || null
    })
    .select()
    .single();
  
  if (error) {
    console.error('Skor kayıt hatası:', error);
    return null;
  }
  return data;
}

export async function getDailyScores(): Promise<ScoreEntry[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .gte('created_at', today.toISOString())
    .order('level', { ascending: false })
    .order('total_time', { ascending: true })
    .limit(50);
  
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function getWeeklyScores(): Promise<ScoreEntry[]> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .gte('created_at', weekAgo.toISOString())
    .order('level', { ascending: false })
    .order('total_time', { ascending: true })
    .limit(50);
  
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function getAllTimeScores(): Promise<ScoreEntry[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('level', { ascending: false })
    .order('total_time', { ascending: true })
    .limit(50);
  
  if (error) { console.error(error); return []; }
  return data || [];
}

// --- Formatting ---

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(2)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}dk ${secs}s`;
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}`;
}
