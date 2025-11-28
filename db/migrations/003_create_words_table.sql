CREATE TABLE IF NOT EXISTS words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  score INTEGER NOT NULL,
  board_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word, board_date)
);

ALTER TABLE words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own words" ON words
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words" ON words
  FOR INSERT WITH CHECK (auth.uid() = user_id);
