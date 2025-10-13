import { z } from "zod";
import {
  findCaregiverByCode,
  findStudentByCode,
  listConnectionsForCaregiver,
  listConnectionsForStudent,
  upsertConnection,
} from "./repository.js";
import { emitToRoom } from "../../realtime/index.js";

const connectSchema = z.object({
  code: z.string().min(3),
});

export async function connectByStudentCode(caregiverId: string, input: unknown) {
  const data = connectSchema.parse(input);

  const student = await findStudentByCode(data.code);
  if (!student) {
    throw new Error("Codigo de estudante invalido");
  }

  await upsertConnection({
    caregiverId,
    studentId: student.user_id,
  });

  const connections = await listConnectionsForCaregiver(caregiverId);
  const connection = connections.find((c: any) => c.student_id === student.user_id);

  emitToRoom(`caregiver:${caregiverId}`, "connection:created", {
    caregiver_id: caregiverId,
    student_id: student.user_id,
  });
  emitToRoom(`student:${student.user_id}`, "connection:created", {
    caregiver_id: caregiverId,
    student_id: student.user_id,
  });

  return { connection, student };
}

export async function connectByCaregiverCode(studentId: string, input: unknown) {
  const data = connectSchema.parse(input);

  const caregiver = await findCaregiverByCode(data.code);
  if (!caregiver) {
    throw new Error("Codigo de cuidador invalido");
  }

  await upsertConnection({
    caregiverId: caregiver.user_id,
    studentId,
  });

  const connections = await listConnectionsForStudent(studentId);
  const connection = connections.find((c: any) => c.caregiver_id === caregiver.user_id);

  emitToRoom(`caregiver:${caregiver.user_id}`, "connection:created", {
    caregiver_id: caregiver.user_id,
    student_id,
  });
  emitToRoom(`student:${studentId}`, "connection:created", {
    caregiver_id: caregiver.user_id,
    student_id,
  });

  return { connection, caregiver };
}

export async function listConnections(userId: string, role: "student" | "caregiver" | "educator") {
  if (role === "caregiver") {
    return listConnectionsForCaregiver(userId);
  }
  if (role === "student") {
    return listConnectionsForStudent(userId);
  }
  return [];
}
