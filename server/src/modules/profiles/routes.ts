import { Router } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { getProfileWithSprite } from "../auth/repository.js";

export function createProfileRouter() {
  const router = Router();

  router.get("/me", async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const result = await getProfileWithSprite(userId);
      res.status(200).json(result ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
