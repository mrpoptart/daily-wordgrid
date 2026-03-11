-- Stores precomputed word length distribution for each daily board.
-- Computed once by the server when a board is first accessed.
CREATE TABLE IF NOT EXISTS board_word_counts (
  board_date DATE PRIMARY KEY,
  total_words INTEGER NOT NULL DEFAULT 0,
  count_4 INTEGER NOT NULL DEFAULT 0,
  count_5 INTEGER NOT NULL DEFAULT 0,
  count_6 INTEGER NOT NULL DEFAULT 0,
  count_7 INTEGER NOT NULL DEFAULT 0,
  count_8_plus INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS needed — this is public, read-only game data (not user-specific).
-- The server writes via the service-role key.
ALTER TABLE board_word_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read board_word_counts" ON board_word_counts
  FOR SELECT USING (true);
