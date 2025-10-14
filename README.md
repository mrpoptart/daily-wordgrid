# Daily Word Grid (Boggle × Wordle)

A daily, deterministic, 5×5 word-finding game that blends the path-finding rules of Boggle with the daily cadence and shareability of Wordle.

## Goals
- Deliver a fun, fair, daily puzzle playable in < 3 minutes
- Deterministic board per day to enable global competition
- Simple onboarding via Supabase Auth
- Low-latency serverless backend on Vercel
- Clean, shared types and validation across frontend and backend

## Daily Flow (User Experience)
1. User opens the app and logs in
2. Sees today’s 5×5 letter board (deterministically generated)
3. Taps/drag-selects adjacent letters to form words (Boggle rules)
4. Submits the round; words and score are stored
5. Score is tied to the user and day; shareable for friendly competition

## Gameplay Rules (Boggle-like)
- Letters must be contiguous; each next letter must be adjacent (including diagonals)
- A tile may not be reused within the same word path
- Minimum word length: 4 letters
- Duplicate words per day do not score twice
- Dictionary validation is enforced server-side (SOWPODS dictionary)
- Scoring (default):
  - 4 letters: 1 point
  - 5 letters: 2 points
  - 6 letters: 3 points
  - 7 letters: 5 points
  - 8+ letters: 11 points

## Tech Stack
- Frontend: Next.js (App Router), React, TypeScript
- Hosting/Backend runtime: Vercel (serverless functions/Edge as appropriate)
- Auth: Supabase Auth
- Database: Supabase Postgres
- ORM: Prisma or Drizzle (TBD)
- Validation/Shared schemas: Zod (shared between server and client)
- UI: Tailwind CSS + headless primitives (e.g., Radix UI/shadcn/ui)
- Testing: Vitest (unit), React Testing Library (components)

## Architecture Overview

```
[ Client (React, Next.js) ]
        │  ▲
        │  │ (typed requests/responses via Zod)
        ▼  │
[ API Routes / Server Actions ]  —>  [ Supabase (Auth, Postgres) ]
                │                         │
                └── ORM (TBD: Prisma/Drizzle) ──┘
```

### Deterministic Daily Board
- Seeded by the calendar date plus a server-side salt to prevent spoofing
- Example approach:
  - `seed = SHA256(YYYY-MM-DD + BOARD_DAILY_SALT)`
  - Use a seeded PRNG to draw letters by frequency distribution
  - Persist only the seed and/or board for auditing; derive board on-demand

### Data Model (initial sketch)
```
users (managed by Supabase Auth)

games
- date (date, PK)
- seed (text)              # generated from date + salt
- board (jsonb)            # optional cache of the 5×5 grid

submissions
- id (uuid, PK)
- user_id (uuid, FK -> users)
- date (date, FK -> games)
- words (jsonb)            # array of submitted words
- score (int)
- created_at (timestamptz)

leaderboards (materialized view or query)
```

### API Surface (planned)
- `GET /api/board?date=YYYY-MM-DD` → returns today’s board and metadata
- `POST /api/validate` → validates a proposed word path against the board
- `POST /api/submit` → stores words + final score for the authenticated user
- `GET /api/leaderboard?date=YYYY-MM-DD` → top scores for the day

## Local Development

### Prerequisites
- Node.js 20+
- npm (or pnpm/yarn/bun)
- Supabase project (for URL and keys)

### Setup
```bash
git clone <this-repo>
cd <repo>
npm install
cp .env.example .env.local   # create and fill in values (see below)
npm run dev
```

Open `http://localhost:3000`.

### Environment Variables
Place these in `.env.local` (local) and in Vercel Project Settings (production):

```
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."         # client-side anon key

# Optional server-only values (do NOT expose publicly):
SUPABASE_SERVICE_ROLE_KEY="..."             # if needed for server tasks
DATABASE_URL="..."                          # for ORM connections
BOARD_DAILY_SALT="..."                      # used for deterministic boards
```

## Testing
- Test runner: Vitest
- Components: @testing-library/react
- Server: unit tests for board generation, scoring, validation, and API handlers

Example commands (to be added to `package.json`):
```bash
npm test            # run unit tests
npm run test:watch  # watch mode
```

## Deployment
- Target: Vercel
- Configure all environment variables in Vercel
- Production board generation uses `BOARD_DAILY_SALT` to ensure fairness
- Supabase connection string (`DATABASE_URL`) should point to project Postgres

## Project Structure (proposed)
```
app/
  page.tsx
  api/
    board/route.ts        # GET board
    submit/route.ts       # POST submission
lib/
  board/                  # deterministic generation
  scoring/                # boggle-like scoring
  schemas/                # zod schemas shared client/server
db/
  schema.ts               # ORM models (TBD)
tests/
  unit/
  e2e/                    # optional
```

## Roadmap
- MVP: Auth, daily board, submission, basic leaderboard, share text
- Anti-cheat: server validation of paths and dictionary; replay checking
- Accessibility: full keyboard and screen-reader support
- PWA: installable app, offline play with deferred submission
- Internationalization: alternate dictionaries/locales

---

Questions, bugs, or ideas? Open an issue or start a discussion.
