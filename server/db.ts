
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use connection pooling URL
const poolUrl = process.env.DATABASE_URL.replace('.us-east-2', '-pooler.us-east-2');
export const pool = new Pool({ connectionString: poolUrl });
export const db = drizzle(pool, { schema });
