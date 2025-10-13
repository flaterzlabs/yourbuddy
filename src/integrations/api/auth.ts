import { get, post, setAuthToken } from "./client";
import type { Database } from "@/integrations/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface ProfileWithSprite {
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
  thriveSprite: Database["public"]["Tables"]["thrive_sprites"]["Row"] | null;
}

export interface AuthPayload extends ProfileWithSprite {
  token: string;
  user: AuthUser;
}

export interface SessionPayload extends ProfileWithSprite {
  user: AuthUser;
}

const BASE = "/auth";

export async function signUp(input: {
  email: string;
  password: string;
  role: UserRole;
  username: string;
}) {
  const response = await post<AuthPayload>(`${BASE}/signup`, input);
  if (!response.error && response.data?.token) {
    setAuthToken(response.data.token);
  }
  return response;
}

export async function signIn(input: { identifier: string; password: string }) {
  const response = await post<AuthPayload>(`${BASE}/login`, input);
  if (!response.error && response.data?.token) {
    setAuthToken(response.data.token);
  }
  return response;
}

export async function logout() {
  const response = await post<{ success: boolean }>(`${BASE}/logout`);
  setAuthToken(null);
  return response;
}

export async function fetchSession() {
  const response = await get<SessionPayload>(`${BASE}/me`);
  return response;
}

export async function requestPasswordReset(identifier: string) {
  return post<{ token?: string }>(`${BASE}/password/reset-request`, { identifier });
}

export async function resetPassword(input: { token: string; password: string }) {
  return post<{ success: boolean }>(`${BASE}/password/reset`, input);
}
