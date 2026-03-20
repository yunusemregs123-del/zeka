// Leaderboard system using Supabase for global scores + localStorage for personal best
import { supabase } from './supabaseClient';

export interface ScoreEntry {
  id: string;
  player_name: string;
  level: number;
  total_time: number;
  created_at: string;
}

const PLAYER_NAME_KEY = 'zeka_player_name';
const PERSONAL_BEST_KEY = 'zeka_personal_best';

// --- Player Name ---
export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

export function setPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name.trim().substring(0, 20));
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

export async function addScore(playerName: string, level: number, totalTime: number): Promise<ScoreEntry | null> {
  const { data, error } = await supabase
    .from('scores')
    .insert({
      player_name: (playerName.trim().substring(0, 20)) || 'Anonim',
      level,
      total_time: Number(totalTime.toFixed(2))
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
