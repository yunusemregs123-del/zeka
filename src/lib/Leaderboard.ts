// Leaderboard system using localStorage
// Future: Replace with Firebase/Supabase for global leaderboards

export interface ScoreEntry {
  id: string;
  playerName: string;
  level: number;
  totalTime: number; // total seconds (lower is better)
  date: string; // ISO date string
  timestamp: number;
}

const STORAGE_KEY = 'zeka_leaderboard';
const PLAYER_NAME_KEY = 'zeka_player_name';
const PERSONAL_BEST_KEY = 'zeka_personal_best';

// --- Player Name ---
export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

export function setPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name.trim().substring(0, 20));
}

// --- Personal Best ---
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
  // Better = higher level, or same level with less time
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

// --- Leaderboard Scores ---
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function getAllScores(): ScoreEntry[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ScoreEntry[];
  } catch {
    return [];
  }
}

export function addScore(playerName: string, level: number, totalTime: number): ScoreEntry {
  const scores = getAllScores();
  const entry: ScoreEntry = {
    id: generateId(),
    playerName: playerName.trim().substring(0, 20) || 'Anonim',
    level,
    totalTime: Number(totalTime.toFixed(2)),
    date: new Date().toISOString(),
    timestamp: Date.now()
  };
  scores.push(entry);
  // Keep only top 100 scores
  scores.sort((a, b) => b.level - a.level || a.totalTime - b.totalTime);
  const trimmed = scores.slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return entry;
}

// --- Filtered Leaderboards ---

export function getDailyScores(): ScoreEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  
  return getAllScores()
    .filter(s => s.timestamp >= todayMs)
    .sort((a, b) => b.level - a.level || a.totalTime - b.totalTime);
}

export function getWeeklyScores(): ScoreEntry[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoMs = weekAgo.getTime();
  
  return getAllScores()
    .filter(s => s.timestamp >= weekAgoMs)
    .sort((a, b) => b.level - a.level || a.totalTime - b.totalTime);
}

export function getAllTimeScores(): ScoreEntry[] {
  return getAllScores()
    .sort((a, b) => b.level - a.level || a.totalTime - b.totalTime);
}

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
