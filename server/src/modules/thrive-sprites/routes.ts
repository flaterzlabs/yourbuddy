import { Router } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { getStudentSprite, saveStudentSprite } from "./service.js";

export function createThriveSpritesRouter() {
  const router = Router();

  router.get("/me", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "student") {
        return res.status(403).json({ error: "Apenas estudantes possuem avatar" });
      }
      const sprite = await getStudentSprite(user.id);
      res.status(200).json(sprite ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.put("/me", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "student") {
        return res.status(403).json({ error: "Apenas estudantes podem atualizar avatar" });
      }
      const sprite = await saveStudentSprite(user.id, req.body);
      res.status(200).json(sprite);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
