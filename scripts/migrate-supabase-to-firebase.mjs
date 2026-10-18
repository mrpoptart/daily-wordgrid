// scripts/migrate-supabase-to-firebase.mjs
//
// One-time migration of a Supabase export into Firebase Auth + Firestore.
//
//   node scripts/migrate-supabase-to-firebase.mjs <export.json> [--dry-run]
//
// Credentials: FIREBASE_SERVICE_ACCOUNT (JSON string) or GOOGLE_APPLICATION_CREDENTIALS.
// Set FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST to target the emulators.
//
// The export is produced by scripts/export-supabase.mjs:
//   { auth_users: [...], users: [...], words: [...], daily_boards: [...] }
//
// Supabase user ids are kept as Firebase uids, so every user_id reference stays
// valid. Google identities are linked by their Google `sub`, so signing in with
// Google lands on the same account. The script is idempotent: re-running it
// overwrites the same documents.

import fs from 'fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'boggle-me';

/** Postgres timestamptz string → Firestore Timestamp, keeping microseconds. */
export function toTimestamp(value) {
  if (!value) return null;
  const match = /^(.*?[T ]\d{2}:\d{2}:\d{2})(?:\.(\d+))?(.*)$/.exec(String(value));
  if (!match) throw new Error(`Unparseable timestamp: ${value}`);
  const [, base, fraction = '', zone] = match;
  const offset = zone === '' || zone === '+00' ? 'Z' : zone.length === 3 ? `${zone}:00` : zone;
  const millis = Date.parse(`${base.replace(' ', 'T')}${offset}`);
  if (Number.isNaN(millis)) throw new Error(`Unparseable timestamp: ${value}`);
  const nanos = Number(fraction.padEnd(9, '0').slice(0, 9));
  return new Timestamp(Math.floor(millis / 1000), nanos);
}

export function toAuthImportRecord(user) {
  const meta = user.raw_user_meta_data ?? user.user_metadata ?? {};
  const displayName = meta.full_name || meta.name || undefined;
  const photoURL = meta.avatar_url || meta.picture || undefined;
  const providerData = (user.identities ?? [])
    .filter((identity) => identity.provider === 'google')
    .map((identity) => ({
      uid: String(identity.identity_data?.sub ?? identity.provider_id),
      providerId: 'google.com',
      email: identity.identity_data?.email ?? user.email ?? undefined,
      displayName: identity.identity_data?.full_name ?? identity.identity_data?.name ?? displayName,
      photoURL: identity.identity_data?.avatar_url ?? identity.identity_data?.picture ?? photoURL,
    }));

  const record = {
    uid: user.id,
    email: user.email ?? undefined,
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at) || providerData.length > 0,
    displayName,
    photoURL,
    metadata: {
      creationTime: user.created_at ? new Date(user.created_at).toUTCString() : undefined,
      lastSignInTime: user.last_sign_in_at ? new Date(user.last_sign_in_at).toUTCString() : undefined,
    },
    providerData,
  };
  return JSON.parse(JSON.stringify(record)); // drop undefined fields
}

export function toUserDoc(row) {
  return {
    id: row.id,
    email: row.email ?? null,
    full_name: row.full_name ?? null,
    created_at: toTimestamp(row.created_at),
    last_login: toTimestamp(row.last_login),
  };
}

export function toWordDoc(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    word: row.word,
    score: row.score,
    board_date: row.board_date,
    created_at: toTimestamp(row.created_at),
    elapsed_at: row.elapsed_at ?? null,
  };
}

export function toDailyBoardDoc(row) {
  return {
    user_id: row.user_id,
    board_date: row.board_date,
    board_started: toTimestamp(row.board_started),
    elapsed_seconds: row.elapsed_seconds ?? 0,
    time_limit_seconds: row.time_limit_seconds ?? 300,
  };
}

export const wordDocId = (row) => `${row.user_id}_${row.board_date}_${row.word}`;
export const dailyBoardDocId = (row) => `${row.user_id}_${row.board_date}`;

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error('Usage: node scripts/migrate-supabase-to-firebase.mjs <export.json> [--dry-run]');
    process.exit(1);
  }
  const dryRun = flags.includes('--dry-run');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const authUsers = data.auth_users ?? [];
  const users = data.users ?? [];
  const words = data.words ?? [];
  const dailyBoards = data.daily_boards ?? [];

  console.log(
    `Export: ${authUsers.length} auth users, ${users.length} users, ${words.length} words, ${dailyBoards.length} daily_boards`,
  );

  const authRecords = authUsers.map(toAuthImportRecord);
  const userDocs = users.map((row) => [row.id, toUserDoc(row)]);
  const wordDocs = words.map((row) => [wordDocId(row), toWordDoc(row)]);
  const boardDocs = dailyBoards.map((row) => [dailyBoardDocId(row), toDailyBoardDoc(row)]);

  for (const [label, docs] of [['words', wordDocs], ['daily_boards', boardDocs]]) {
    const ids = new Set(docs.map(([id]) => id));
    if (ids.size !== docs.length) throw new Error(`Duplicate ${label} document ids`);
  }

  if (dryRun) {
    console.log('Dry run: sample auth record', JSON.stringify(authRecords[0], null, 2));
    console.log('Dry run: sample word', wordDocs[0]);
    return;
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const app = initializeApp(
    serviceAccount
      ? { credential: cert(JSON.parse(serviceAccount)), projectId: PROJECT_ID }
      : { projectId: PROJECT_ID },
  );
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 1. Auth users. Accounts already imported by an earlier run are left as-is.
  let skipped = 0;
  const missing = [];
  for (let i = 0; i < authRecords.length; i += 100) {
    const batch = authRecords.slice(i, i + 100);
    const { users: found } = await auth.getUsers(batch.map(({ uid }) => ({ uid })));
    const existing = new Map(found.map((user) => [user.uid, user]));
    for (const record of batch) {
      const user = existing.get(record.uid);
      if (!user) {
        missing.push(record);
      } else if (user.email !== record.email) {
        throw new Error(`uid ${record.uid} already exists with a different email (${user.email})`);
      } else {
        skipped++;
      }
    }
  }
  for (let i = 0; i < missing.length; i += 1000) {
    const batch = missing.slice(i, i + 1000);
    const result = await auth.importUsers(batch);
    for (const failure of result.errors) {
      console.error(`Failed to import ${batch[failure.index].email}: ${failure.error.message}`);
    }
    if (result.failureCount > 0) throw new Error(`${result.failureCount} auth imports failed`);
  }
  console.log(`Imported ${missing.length} auth users (${skipped} already present)`);

  // 2. Firestore documents
  const writer = db.bulkWriter();
  let failures = 0;
  writer.onWriteError((error) => {
    if (error.failedAttempts < 5) return true;
    failures++;
    console.error(`Failed to write ${error.documentRef.path}: ${error.message}`);
    return false;
  });
  for (const [id, doc] of userDocs) writer.set(db.collection('users').doc(id), doc);
  for (const [id, doc] of wordDocs) writer.set(db.collection('words').doc(id), doc);
  for (const [id, doc] of boardDocs) writer.set(db.collection('daily_boards').doc(id), doc);
  await writer.close();
  if (failures > 0) throw new Error(`${failures} Firestore writes failed`);

  // 3. Verify counts per user
  const expected = new Map();
  for (const row of words) expected.set(row.user_id, (expected.get(row.user_id) ?? 0) + 1);
  let mismatches = 0;
  for (const [userId, count] of expected) {
    const actual = (await db.collection('words').where('user_id', '==', userId).count().get()).data().count;
    if (actual !== count) {
      mismatches++;
      console.error(`Word count mismatch for ${userId}: expected ${count}, got ${actual}`);
    }
  }
  const counts = {};
  for (const name of ['users', 'words', 'daily_boards']) {
    counts[name] = (await db.collection(name).count().get()).data().count;
  }
  console.log('Firestore totals:', counts);
  if (mismatches > 0) throw new Error(`${mismatches} users have mismatched word counts`);
  console.log('Migration complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
}
