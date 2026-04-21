-- Adds support for time extensions on daily boards.
-- Players can extend past the default 5 minutes in 5-minute increments.
-- Score segmentation is derived at render time from each word's elapsed_at.
ALTER TABLE daily_boards
  ADD COLUMN IF NOT EXISTS time_limit_seconds INTEGER NOT NULL DEFAULT 300;
