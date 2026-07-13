import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type AppDatabase = NeonHttpDatabase<typeof schema>;

let cachedDb: AppDatabase | null = null;

export function getDb(): AppDatabase {
  if (!cachedDb) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is missing. Create a free Neon database and add DATABASE_URL to .env.local (and Vercel)."
      );
    }
    cachedDb = drizzle(neon(url), { schema });
  }
  return cachedDb;
}
