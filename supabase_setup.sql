-- Supabase SQL Editor'de bunu çalıştır

CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL DEFAULT 'Anonim',
  level INTEGER NOT NULL,
  total_time DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Herkese okuma izni ver (public leaderboard)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes skorları görebilir" ON scores
  FOR SELECT USING (true);

CREATE POLICY "Herkes skor ekleyebilir" ON scores
  FOR INSERT WITH CHECK (true);

-- Hızlı sorgular için index
CREATE INDEX idx_scores_level_time ON scores (level DESC, total_time ASC);
CREATE INDEX idx_scores_created_at ON scores (created_at DESC);
