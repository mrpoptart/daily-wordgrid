// scripts/export-supabase.mjs
//
// Exports everything the Firebase migration needs from Supabase to a JSON file.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/export-supabase.mjs supabase-export.json

import fs from 'fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const out = process.argv[2] || 'supabase-export.json';
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function fetchJson(path, extraHeaders = {}) {
  const res = await fetch(`${url}${path}`, { headers: { ...headers, ...extraHeaders } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchTable(table, order) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const page = await fetchJson(`/rest/v1/${table}?select=*&order=${order}`, {
      Range: `${from}-${from + pageSize - 1}`,
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function fetchAuthUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const body = await fetchJson(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    users.push(...body.users);
    if (body.users.length < 1000) return users;
  }
}

const data = {
  exported_at: new Date().toISOString(),
  auth_users: await fetchAuthUsers(),
  users: await fetchTable('users', 'id'),
  words: await fetchTable('words', 'id'),
  daily_boards: await fetchTable('daily_boards', 'user_id,board_date'),
};
fs.writeFileSync(out, JSON.stringify(data));
console.log(
  `Wrote ${out}: ${data.auth_users.length} auth users, ${data.users.length} users, ` +
    `${data.words.length} words, ${data.daily_boards.length} daily_boards`,
);
