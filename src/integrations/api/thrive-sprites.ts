import type { Database } from "@/integrations/supabase/types";
import { get, put, type ApiResponse } from "./client";

export type ThriveSprite = Database["public"]["Tables"]["thrive_sprites"]["Row"];

export function fetchMySprite(): Promise<ApiResponse<ThriveSprite | null>> {
  return get<ThriveSprite | null>("/thrive-sprites/me");
}

export function upsertMySprite(input: {
  imageUrl: string;
  options?: Record<string, unknown> | null;
}): Promise<ApiResponse<ThriveSprite>> {
  return put<ThriveSprite>("/thrive-sprites/me", input);
}
