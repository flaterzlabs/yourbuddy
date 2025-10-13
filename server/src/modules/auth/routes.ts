import { Router } from "express";
import type { AuthenticatedRequest, createAuthMiddleware } from "../../middleware/auth.js";
import { fetchSession, requestPasswordReset, resetPassword, signIn, signUp } from "./service.js";

export function createAuthRouter(authMiddleware: ReturnType<typeof createAuthMiddleware>) {
  const router = Router();

  router.post("/signup", async (req, res) => {
    try {
      const result = await signUp(req.body);
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const result = await signIn(req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.get("/me", authMiddleware.guard, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const result = await fetchSession(user.id);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.post("/logout", (_req, res) => {
    res.status(200).json({ success: true });
  });

  router.post("/password/reset-request", async (req, res) => {
    try {
      const result = await requestPasswordReset(req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.post("/password/reset", async (req, res) => {
    try {
      const result = await resetPassword(req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
