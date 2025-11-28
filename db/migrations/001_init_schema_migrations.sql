CREATE TABLE IF NOT EXISTS schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
