import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool);
