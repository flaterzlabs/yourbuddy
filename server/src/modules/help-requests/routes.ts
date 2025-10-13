import { Router } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { createRequest, listHelpRequests, resolveRequest } from "./service.js";

export function createHelpRequestsRouter() {
  const router = Router();

  router.get("/", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const result = await listHelpRequests(user);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.post("/", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "student") {
        return res.status(403).json({ error: "Apenas estudantes podem criar pedidos" });
      }
      const result = await createRequest(user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.patch("/:id", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "caregiver") {
        return res.status(403).json({ error: "Apenas cuidadores podem atualizar pedidos" });
      }
      const result = await resolveRequest(user.id, req.params.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
