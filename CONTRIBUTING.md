# Contributing to Daily Word Grid

Thanks for helping build Daily Word Grid! Please follow these guidelines so we can ship fast and safely.

## Folder Map
- `app/`: Next.js App Router pages, layouts, and API routes
- `public/`: Static assets
- `lib/` (planned): Shared logic (board generation, scoring, schemas)
- `db/` (planned): ORM models and migrations
- `tests/`: Vitest test suites
- Root config: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`

## Small-PR Rule
- Prefer PRs under ~300 lines of diff
- Keep scope tightly focused; split large changes into sequential PRs
- Include tests and update docs/configs as needed

## Runtime Split
- Frontend/UI: Next.js (React, TypeScript)
- Server: Next.js API routes or Server Actions (edge/serverless on Vercel)
- Shared types/validation via Zod (planned)
- Database via Supabase Postgres with ORM (planned)

## Local Dev
```bash
npm install
npm run dev
```

## Quality Gates
- Lint: `npm run lint` (no warnings allowed) — must be clean before commit/PR
- Typecheck: `npm run typecheck`
- Tests: `npm test`

CI will block merges if any gate fails.

## Secrets Policy
- Never commit secrets or `.env*` files
- Use `.env.local` for local dev; do not commit it
- Configure environment variables in Vercel project settings for deploys
- Required variables (examples):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only if needed)
  - `DATABASE_URL` (server-only)
  - `BOARD_DAILY_SALT` (server-only, used for deterministic boards)

## Commit & PR
- Use clear, descriptive commit messages focused on intent
- PR template checklist must be satisfied
- Link issues and include context for reviewers
 - Pre-commit hook: ESLint runs on staged files and auto-fixes when possible. Fix remaining issues before committing. If a commit fails, run `npm run lint` and address errors.
