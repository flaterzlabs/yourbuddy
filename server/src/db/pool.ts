import { Pool } from "pg";
import { loadEnv } from "../config/env.js";

const env = loadEnv();

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  console.error("Unexpected PG error", error);
});
