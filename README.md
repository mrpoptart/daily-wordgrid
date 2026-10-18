# Daily Word Grid (Boggle × Wordle)

A daily, deterministic, 5×5 word-finding game that blends the path-finding rules of Boggle with the daily cadence and shareability of Wordle.

## Goals
- Deliver a fun, fair, daily puzzle playable in < 3 minutes
- Deterministic board per day to enable global competition
- Simple onboarding via Firebase Auth (Google, email magic link)
- Low-latency serverless backend on Vercel
- Clean, shared types and validation across frontend and backend

## Daily Flow (User Experience)
1. User opens the app and logs in (or plays anonymously if supported)
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
- Auth/Database: Firebase Auth + Cloud Firestore (project `boggle-me`)
- UI: Tailwind CSS + headless primitives (e.g., Radix UI/shadcn/ui)
- Testing: Vitest (unit), React Testing Library (components)

## Architecture Overview

```
[ Client (React, Next.js) ]
        │  ▲
        │  │ (typed requests/responses via Zod)
        ▼  │
[ API Routes ]  (board generation + word validation; no database access)

[ Client ] —> [ Firebase Auth + Firestore (client SDK, guarded by firestore.rules) ]
```

### Deterministic Daily Board
- Seeded by the calendar date plus a server-side salt to prevent spoofing
- Example approach:
  - `seed = SHA256(YYYY-MM-DD + BOARD_DAILY_SALT)`
  - Use a seeded PRNG to draw letters by frequency distribution
  - Persist only the seed and/or board for auditing; derive board on-demand

### Data Model (Firestore)
Collections mirror the former Supabase tables field-for-field (see `lib/db-schema.ts`).
Dates are `YYYY-MM-DD` strings; timestamps are Firestore `Timestamp`s.
```
users/{uid}                              id, email, full_name, created_at, last_login
words/{user_id}_{board_date}_{word}      id, user_id, word, score, board_date, created_at, elapsed_at
daily_boards/{user_id}_{board_date}      user_id, board_date, board_started, elapsed_seconds, time_limit_seconds
```
Composite keys are deterministic document IDs, so there is one document per key. Access control
lives in `firestore.rules` (each user can read and write only their own data) and is tested with
`npm run test:emulator`. Deploy rules with `npm run deploy:rules`.

Boards are deterministic, so the API generates them (and their word-length counts) on demand
rather than storing them.

### API Surface (planned)
- `GET /api/board?date=YYYY-MM-DD` → returns today’s board and metadata
- `POST /api/validate` → validates a proposed word path against the board
- `GET /api/leaderboard?date=YYYY-MM-DD` → top scores for the day (returns `unavailable` until scores are stored)

### Health Check
- `GET /api/health` → returns `{ status: "ok" | "degraded", env: { firebaseProjectId, firebaseHealth, firebaseError, ... } }`.
- `status` is `"degraded"` and `env.firebaseError` carries the underlying error whenever Firestore cannot be reached .

## Local Development

### Prerequisites
- Node.js 20+
- npm (or pnpm/yarn/bun)
- Java 11+ (for the Firebase emulators)

### Setup

1. **Install Dependencies**
   ```bash
   git clone <this-repo>
   cd <repo>
   npm install
   ```

2. **Start the Firebase emulators**
   ```bash
   npm run emulators
   ```

3. **Configure Environment** (`.env.local`)
   ```
   NEXT_PUBLIC_FIREBASE_EMULATOR=1
   ```
   Omit it to run against the real `boggle-me` project.

4. **Run App**
   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`.

### Linting requirement (pre-commit and build)
- The repo enforces linting before builds and commits.
- Run locally before committing or opening a PR:
  - `npm run lint` (no warnings allowed)
  - `npm run typecheck`
- `npm run build` will fail if `npm run lint` fails.

## Testing
- Test runner: Vitest
- Components: @testing-library/react
- Server: unit tests for board generation, scoring, validation, and API handlers

Example commands:
```bash
npm test            # run unit tests
npm run test:watch  # watch mode
```

## Deployment
- Target: Vercel
- Firebase project: `boggle-me` (web config is in `lib/firebase.ts`; it is public by design).
- Configure `BOARD_DAILY_SALT` in Vercel (no Firebase secrets are needed).
- In the Firebase console, enable the Google and Email link sign-in providers and add the production domain under Authentication → Settings → Authorized domains.

---

Questions, bugs, or ideas? Open an issue or start a discussion.
