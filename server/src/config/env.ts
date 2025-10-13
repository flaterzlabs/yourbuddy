import dotenv from "dotenv";

const DEFAULT_PORT = 4000;

export interface Env {
  nodeEnv: string;
  port: number;
  corsOrigins: string | string[];
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  dotenv.config();

  const {
    NODE_ENV = "development",
    PORT,
    CORS_ORIGINS = "http://localhost:5173",
    DATABASE_URL,
    JWT_SECRET,
    JWT_EXPIRES_IN = "24h",
  } = process.env;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  cachedEnv = {
    nodeEnv: NODE_ENV,
    port: Number(PORT) || DEFAULT_PORT,
    corsOrigins: CORS_ORIGINS.split(",").map((item) => item.trim()),
    databaseUrl: DATABASE_URL,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
  };

  return cachedEnv;
}
