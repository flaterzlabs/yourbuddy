import { z } from "zod";
import { getSprite, upsertSprite } from "./repository.js";

const upsertSchema = z.object({
  imageUrl: z.string().url(),
  options: z.record(z.any()).optional(),
});

export async function getStudentSprite(studentId: string) {
  return getSprite(studentId);
}

export async function saveStudentSprite(studentId: string, input: unknown) {
  const data = upsertSchema.parse(input);
  return upsertSprite({
    studentId,
    imageUrl: data.imageUrl,
    options: data.options ?? null,
  });
}
