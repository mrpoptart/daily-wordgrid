import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const databaseFilePath = process.env.DATABASE_PATH ?? "/workspace/db/app.sqlite";

export const sqlite = new Database(databaseFilePath);
export const db = drizzle(sqlite);
