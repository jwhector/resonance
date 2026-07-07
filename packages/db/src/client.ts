import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** Production client over the Neon serverless HTTP driver. Lazily reads DATABASE_URL. */
export function createDb(
  connectionString = process.env.DATABASE_URL,
): NeonHttpDatabase<typeof schema> {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the production database client");
  }
  return drizzle({ client: neon(connectionString), schema });
}
