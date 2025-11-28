CREATE TABLE IF NOT EXISTS daily_boards (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_date DATE NOT NULL,
  board_started TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, board_date)
);

ALTER TABLE daily_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily_boards" ON daily_boards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_boards" ON daily_boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_boards" ON daily_boards
  FOR UPDATE USING (auth.uid() = user_id);
