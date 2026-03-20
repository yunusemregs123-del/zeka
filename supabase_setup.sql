-- Supabase SQL Editor'de bunu çalıştır

CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL DEFAULT 'Anonim',
  level INTEGER NOT NULL,
  total_time DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  country_code TEXT
);

-- (Eğer tablo çoktan oluşturulduysa, country_code sütununu eklemek için aşağıdaki satırı çalıştırın)
-- ALTER TABLE scores ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Herkese okuma izni ver (public leaderboard)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes skorları görebilir" ON scores;
CREATE POLICY "Herkes skorları görebilir" ON scores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Herkes skor ekleyebilir" ON scores;
CREATE POLICY "Herkes skor ekleyebilir" ON scores
  FOR INSERT WITH CHECK (true);

-- Hızlı sorgular için index
CREATE INDEX IF NOT EXISTS idx_scores_level_time ON scores (level DESC, total_time ASC);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores (created_at DESC);
