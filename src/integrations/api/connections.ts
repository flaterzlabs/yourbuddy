import type { Database } from "@/integrations/supabase/types";
import { get, post, type ApiResponse } from "./client";

type ConnectionRow = Database["public"]["Tables"]["connections"]["Row"];

export interface ConnectionWithProfile extends ConnectionRow {
  student_profile?: Database["public"]["Tables"]["profiles"]["Row"] | null;
  caregiver_profile?: Database["public"]["Tables"]["profiles"]["Row"] | null;
  thrive_sprite?: Database["public"]["Tables"]["thrive_sprites"]["Row"] | null;
}

export interface ConnectionByCodeResponse {
  connection: ConnectionWithProfile;
  student?: {
    user_id: string;
    username: string;
    student_code: string | null;
  };
  caregiver?: {
    user_id: string;
    username: string;
    caregiver_code: string | null;
  };
}

export function fetchConnections(): Promise<ApiResponse<ConnectionWithProfile[]>> {
  return get<ConnectionWithProfile[]>("/connections");
}

export function connectByStudentCode(code: string): Promise<ApiResponse<ConnectionByCodeResponse>> {
  return post<ConnectionByCodeResponse>("/connections/by-student-code", { code });
}

export function connectByCaregiverCode(code: string): Promise<ApiResponse<ConnectionByCodeResponse>> {
  return post<ConnectionByCodeResponse>("/connections/by-caregiver-code", { code });
}
