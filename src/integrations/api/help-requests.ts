import type { Database } from "@/integrations/supabase/types";
import { get, patch, post, type ApiResponse } from "./client";

export type HelpRequest = Database["public"]["Tables"]["help_requests"]["Row"];
export interface HelpRequestWithProfile extends HelpRequest {
  student_profile?: Database["public"]["Tables"]["profiles"]["Row"] | null;
}
export type HelpRequestStatus = Database["public"]["Enums"]["request_status"];
export type UrgencyLevel = Database["public"]["Enums"]["urgency_level"];

export function fetchHelpRequests(): Promise<ApiResponse<HelpRequestWithProfile[]>> {
  return get<HelpRequestWithProfile[]>("/help-requests");
}

export function createHelpRequest(input: {
  message?: string;
  urgency?: UrgencyLevel;
}): Promise<ApiResponse<HelpRequest>> {
  return post<HelpRequest>("/help-requests", input);
}

export function updateHelpRequestStatus(input: {
  id: string;
  status: Extract<HelpRequestStatus, "answered" | "closed">;
}): Promise<ApiResponse<HelpRequest>> {
  return patch<HelpRequest>(`/help-requests/${input.id}`, { status: input.status });
}
