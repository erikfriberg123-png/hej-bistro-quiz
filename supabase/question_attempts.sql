-- Run this in the Supabase SQL editor

-- 1. Attempts table
CREATE TABLE IF NOT EXISTS question_attempts (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id TEXT        NOT NULL REFERENCES remote_questions(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  correct     BOOLEAN     NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'game'
              CHECK (source IN ('game', 'battle', 'daily')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_question ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created  ON question_attempts(created_at);

ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert attempts" ON question_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can read attempts" ON question_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 2. RPC: aggregate correct/wrong rates per question (min 3 attempts)
CREATE OR REPLACE FUNCTION get_question_stats()
RETURNS TABLE (
  question_id   TEXT,
  total         BIGINT,
  correct_count BIGINT,
  correct_rate  FLOAT
)
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    question_id,
    COUNT(*)                                          AS total,
    SUM(correct::int)                                 AS correct_count,
    ROUND(AVG(correct::float)::numeric, 4)::float     AS correct_rate
  FROM question_attempts
  GROUP BY question_id
  HAVING COUNT(*) >= 3
  ORDER BY correct_rate DESC;
$$;

-- 3. RPC: battles + unique players per day (last 30 days, Paris time)
CREATE OR REPLACE FUNCTION get_battles_per_day()
RETURNS TABLE (
  day          DATE,
  battle_count BIGINT,
  player_count BIGINT
)
LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    DATE(created_at AT TIME ZONE 'Europe/Paris')  AS day,
    COUNT(*)                                       AS battle_count,
    COUNT(DISTINCT creator_id)
      + COUNT(DISTINCT opponent_id)
        FILTER (WHERE opponent_id IS NOT NULL)     AS player_count
  FROM battles
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at AT TIME ZONE 'Europe/Paris')
  ORDER BY day DESC;
$$;
