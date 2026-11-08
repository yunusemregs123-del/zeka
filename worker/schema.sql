-- Cloudflare D1 Database Schema for ZEKA Mind Puzzle
-- 15-Year Scalable High-Performance Schema

-- 1. ALL-TIME LEADERBOARD (Single lifetime best per player, unique by name)
CREATE TABLE IF NOT EXISTS scores_alltime (
  player_name TEXT PRIMARY KEY COLLATE NOCASE,
  device_id TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL,
  total_time REAL NOT NULL,
  country TEXT NOT NULL DEFAULT 'TR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scores_alltime_rank ON scores_alltime (level DESC, total_time ASC);
CREATE INDEX IF NOT EXISTS idx_scores_alltime_device ON scores_alltime (device_id);

-- 2. DAILY LEADERBOARD (Bucket-partitioned by 'YYYY-MM-DD')
CREATE TABLE IF NOT EXISTS scores_daily (
  period_date TEXT NOT NULL,
  player_name TEXT NOT NULL COLLATE NOCASE,
  device_id TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL,
  total_time REAL NOT NULL,
  country TEXT NOT NULL DEFAULT 'TR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_date, player_name)
);
CREATE INDEX IF NOT EXISTS idx_scores_daily_rank ON scores_daily (period_date, level DESC, total_time ASC);

-- 3. WEEKLY LEADERBOARD (Bucket-partitioned by 'YYYY-Www')
CREATE TABLE IF NOT EXISTS scores_weekly (
  period_week TEXT NOT NULL,
  player_name TEXT NOT NULL COLLATE NOCASE,
  device_id TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL,
  total_time REAL NOT NULL,
  country TEXT NOT NULL DEFAULT 'TR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_week, player_name)
);
CREATE INDEX IF NOT EXISTS idx_scores_weekly_rank ON scores_weekly (period_week, level DESC, total_time ASC);

-- Legacy scores table for backwards compatibility
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL COLLATE NOCASE,
  device_id TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL,
  total_time REAL NOT NULL,
  country TEXT NOT NULL DEFAULT 'TR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scores_legacy_rank ON scores (level DESC, total_time ASC);
CREATE INDEX IF NOT EXISTS idx_scores_legacy_player ON scores (player_name COLLATE NOCASE);

-- 4. 1v1 DUEL ROOMS TABLE (With round tracking, emote sequences, atomic rematch)
CREATE TABLE IF NOT EXISTS duel_rooms (
  room_code TEXT PRIMARY KEY,
  round_number INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
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
  host_emote_seq INTEGER NOT NULL DEFAULT 0,
  guest_emote_seq INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'ACTIVE', 'FINISHED', 'FORFEIT', 'CLOSED'
  winner_id TEXT,
  rematch_host INTEGER NOT NULL DEFAULT 0,
  rematch_guest INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_duel_status ON duel_rooms (status);
CREATE INDEX IF NOT EXISTS idx_duel_updated ON duel_rooms (updated_at);

-- 5. GLOBAL MATCHMAKING QUEUE TABLE
CREATE TABLE IF NOT EXISTS duel_queue (
  player_id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  player_country TEXT NOT NULL DEFAULT 'TR',
  matched_room_code TEXT,
  status TEXT NOT NULL DEFAULT 'SEARCHING', -- 'SEARCHING', 'MATCHED'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON duel_queue (status, created_at ASC);

-- 6. USER CLOUD ACCOUNTS & CROSS-DEVICE CLOUD SAVE
CREATE TABLE IF NOT EXISTS user_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'guest',          -- 'guest', 'google', 'apple', 'recovery_code'
  provider_user_id TEXT,                         -- External OAuth ID from Google Play / Apple
  recovery_code TEXT UNIQUE,                     -- Short memorable recovery code e.g. 'ZK-4892'
  device_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  country TEXT DEFAULT 'TR',
  max_level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 75,
  gift_coins INTEGER NOT NULL DEFAULT 0,
  force_coins INTEGER DEFAULT NULL,
  last_claimed_weekly_reward TEXT DEFAULT '',
  time_attack_best INTEGER DEFAULT 0,
  memory_best INTEGER DEFAULT 0,
  medals TEXT DEFAULT '[]',
  claimed_medals TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_device ON user_accounts (device_id);
CREATE INDEX IF NOT EXISTS idx_users_provider ON user_accounts (provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_users_recovery ON user_accounts (recovery_code);
