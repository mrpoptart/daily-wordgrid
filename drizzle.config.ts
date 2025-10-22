import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/postgres",
  },
} satisfies Config;
