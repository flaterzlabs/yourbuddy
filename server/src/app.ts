import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { json } from "express";
import { loadEnv } from "./config/env.js";
import { createAuthRouter } from "./modules/auth/routes.js";
import { createProfileRouter } from "./modules/profiles/routes.js";
import { createConnectionsRouter } from "./modules/connections/routes.js";
import { createHelpRequestsRouter } from "./modules/help-requests/routes.js";
import { createThriveSpritesRouter } from "./modules/thrive-sprites/routes.js";
import { createAuthMiddleware } from "./middleware/auth.js";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./docs/openapi.js";

export function createApp() {
  const env = loadEnv();
  const app = express();
  const authMiddleware = createAuthMiddleware();

  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(json());
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get("/docs.json", (_req, res) => {
    res.json(openApiDocument);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter(authMiddleware));
  app.use("/profiles", authMiddleware.guard, createProfileRouter());
  app.use("/connections", authMiddleware.guard, createConnectionsRouter());
  app.use("/help-requests", authMiddleware.guard, createHelpRequestsRouter());
  app.use("/thrive-sprites", authMiddleware.guard, createThriveSpritesRouter());

  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  return { app, authMiddleware };
}
