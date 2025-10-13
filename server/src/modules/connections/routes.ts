import { Router } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.js";
import { connectByCaregiverCode, connectByStudentCode, listConnections } from "./service.js";

export function createConnectionsRouter() {
  const router = Router();

  router.get("/", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const result = await listConnections(user.id, user.role);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.post("/by-student-code", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "caregiver") {
        return res.status(403).json({ error: "Acesso negado" });
      }
      const result = await connectByStudentCode(user.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  router.post("/by-caregiver-code", async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user || user.role !== "student") {
        return res.status(403).json({ error: "Acesso negado" });
      }
      const result = await connectByCaregiverCode(user.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
