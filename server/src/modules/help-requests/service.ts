import { z } from "zod";
import { createHelpRequest, listCaregiverRequests, listCaregiversForStudent, listStudentRequests, updateHelpRequestStatus } from "./repository.js";
import { emitToRoom, broadcast } from "../../realtime/index.js";

const createSchema = z.object({
  message: z.string().max(500).optional(),
  urgency: z.enum(["ok", "attention", "urgent"]).optional(),
});

const updateSchema = z.object({
  status: z.enum(["answered", "closed"]),
});

export async function listHelpRequests(user: { id: string; role: "student" | "caregiver" | "educator" }) {
  if (user.role === "student") {
    return listStudentRequests(user.id);
  }
  if (user.role === "caregiver") {
    return listCaregiverRequests(user.id);
  }
  return [];
}

export async function createRequest(userId: string, input: unknown) {
  const data = createSchema.parse(input);
  const request = await createHelpRequest({
    studentId: userId,
    message: data.message,
    urgency: data.urgency,
  });

  broadcast("help_request:new", request);
  const caregiverIds = await listCaregiversForStudent(request.student_id);
  caregiverIds.forEach((caregiverId) => {
    emitToRoom(`caregiver:${caregiverId}`, "help_request:new", request);
  });

  return request;
}

export async function resolveRequest(caregiverId: string, requestId: string, input: unknown) {
  const data = updateSchema.parse(input);
  const updated = await updateHelpRequestStatus({
    requestId,
    status: data.status,
    resolvedBy: caregiverId,
  });
  if (updated) {
    emitToRoom(`student:${updated.student_id}`, "help_request:updated", updated);
    const caregiverIds = await listCaregiversForStudent(updated.student_id);
    caregiverIds.forEach((id) => {
      emitToRoom(`caregiver:${id}`, "help_request:updated", updated);
    });
  }
  return updated;
}
