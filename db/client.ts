import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

export const pool = new Pool({ connectionString });
export type Database = NodePgDatabase<typeof schema>;

export const db: Database = drizzle(pool, { schema });
