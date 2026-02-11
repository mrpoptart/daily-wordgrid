CREATE TABLE IF NOT EXISTS games (
  date DATE NOT NULL PRIMARY KEY,
  letters TEXT NOT NULL,
  seed TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Public read access" ON games
  FOR SELECT USING (true);

-- Allow service role to insert/update (implicit, but good to know)
-- Supabase service role bypasses RLS, so no specific policy needed for insert if only used by server.
-- However, if we want to be explicit or if we change how it's accessed:

-- We don't need user policies since users don't write to this table.
