ALTER TABLE daily_boards
  ADD COLUMN elapsed_seconds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE words
  ADD COLUMN elapsed_at INTEGER;
