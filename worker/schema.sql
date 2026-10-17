-- Cloudflare D1 Database Schema for ZEKA Mind Puzzle
-- Global Leaderboard & Real-Time 1v1 Multiplayer Tables

-- 1. SCORES TABLE
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL,
  total_time REAL NOT NULL,
  country TEXT NOT NULL DEFAULT 'TR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_level_time ON scores (level DESC, total_time ASC);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores (player_name);
CREATE INDEX IF NOT EXISTS idx_scores_device ON scores (device_id);

-- 2. 1v1 DUEL ROOMS TABLE
CREATE TABLE IF NOT EXISTS duel_rooms (
  room_code TEXT PRIMARY KEY,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_country TEXT NOT NULL DEFAULT 'TR',
  guest_id TEXT,
  guest_name TEXT,
  guest_country TEXT,
  seed INTEGER NOT NULL,
  host_score INTEGER NOT NULL DEFAULT 0,
  guest_score INTEGER NOT NULL DEFAULT 0,
  host_emote TEXT,
  guest_emote TEXT,
  status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'ACTIVE', 'FINISHED', 'FORFEIT'
  winner_id TEXT,
  rematch_host INTEGER NOT NULL DEFAULT 0,
  rematch_guest INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_duel_status ON duel_rooms (status, updated_at DESC);

-- 3. GLOBAL MATCHMAKING QUEUE TABLE
CREATE TABLE IF NOT EXISTS duel_queue (
  player_id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  player_country TEXT NOT NULL DEFAULT 'TR',
  matched_room_code TEXT,
  status TEXT NOT NULL DEFAULT 'SEARCHING', -- 'SEARCHING', 'MATCHED'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON duel_queue (status, created_at ASC);
