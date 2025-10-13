import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createAuthMiddleware } from "../../middleware/auth.js";
import {
  createPasswordResetToken,
  createProfileForUser,
  createUser,
  findUserByEmail,
  findUserByEmailOrUsername,
  findUserById,
  findUserByUsername,
  findValidPasswordResetToken,
  getProfileWithSprite,
  markPasswordResetUsed,
  updateUserPassword,
} from "./repository.js";
import { generateCaregiverCode, generateStudentCode } from "../connections/code-generator.js";

const auth = createAuthMiddleware();

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50),
  role: z.enum(["student", "caregiver", "educator"]),
});

export const signInSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8),
});

export const resetRequestSchema = z.object({
  identifier: z.string().min(3),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export async function signUp(input: unknown) {
  const data = signUpSchema.parse(input);

  const existing = await findUserByEmail(data.email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await createUser({
    email: data.email,
    passwordHash,
    role: data.role,
  });

  try {
    await createProfileForUser({
      userId: user.id,
      username: data.username,
      role: data.role,
      caregiverCode: data.role === "caregiver" ? generateCaregiverCode() : null,
      studentCode: data.role === "student" ? generateStudentCode() : null,
    });
  } catch (error) {
    // Roll back user row if profile creation fails (e.g., duplicate username)
    if ((error as any)?.code === "23505") {
      throw new Error("Username already in use");
    }
    throw error;
  }

  const token = auth.sign({ sub: user.id, email: user.email, role: user.role });
  const session = await getProfileWithSprite(user.id);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: session?.profile ?? null,
    thriveSprite: session?.sprite ?? null,
  };
}

export async function signIn(input: unknown) {
  const data = signInSchema.parse(input);

  const byEmail = await findUserByEmail(data.identifier);
  const byUsername = await findUserByUsername(data.identifier);

  const user = byEmail ?? byUsername;
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(data.password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const token = auth.sign({ sub: user.id, email: user.email, role: user.role });
  const profile = await getProfileWithSprite(user.id);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: profile?.profile ?? null,
    thriveSprite: profile?.sprite ?? null,
  };
}

export async function fetchSession(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const profile = await getProfileWithSprite(user.id);
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    profile: profile?.profile ?? null,
    thriveSprite: profile?.sprite ?? null,
  };
}

export async function requestPasswordReset(input: unknown) {
  const data = resetRequestSchema.parse(input);

  const user = await findUserByEmailOrUsername(data.identifier);
  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await createPasswordResetToken({
    userId: user.id,
    token,
    expiresAt,
  });

  return { token };
}

export async function resetPassword(input: unknown) {
  const data = resetPasswordSchema.parse(input);

  const resetToken = await findValidPasswordResetToken(data.token);
  if (!resetToken) {
    throw new Error("Token inválido ou expirado");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await updateUserPassword(resetToken.user_id, passwordHash);
  await markPasswordResetUsed(resetToken.id);

  return { success: true };
}
