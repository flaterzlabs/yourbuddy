const DEFAULT_DEV_API_BASE_URL = "http://localhost:4000";

const rawEnvBaseUrl =
  typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL.trim() : "";
const API_BASE_URL =
  rawEnvBaseUrl || (import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : "");
const HAS_API_BASE_URL = Boolean(API_BASE_URL);

if (!rawEnvBaseUrl && import.meta.env.DEV) {
  console.info(`[api] VITE_API_BASE_URL não configurada. Usando padrão ${DEFAULT_DEV_API_BASE_URL} em desenvolvimento.`);
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  if (!HAS_API_BASE_URL) {
    console.warn("VITE_API_BASE_URL não configurada");
    return { data: null, error: "API base URL não configurada", status: 0 };
  }

  const token = localStorage.getItem("yb_token");

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorMessage = payload?.error ?? response.statusText;
      return { data: null, error: errorMessage, status: response.status };
    }

    return { data: payload as T, error: null, status: response.status };
  } catch (error) {
    console.error("[api] request failed:", error);
    const message =
      error instanceof Error
        ? error.message === "Failed to fetch"
          ? "Não foi possível contatar o servidor. Verifique se o backend está rodando e se VITE_API_BASE_URL está correto."
          : error.message
        : "Falha ao contatar o servidor.";
    return { data: null, error: message, status: 0 };
  }
}

export function get<T>(path: string, init?: RequestInit) {
  return request<T>(path, { ...init, method: "GET" });
}

export function post<T>(path: string, body?: unknown, init?: RequestInit) {
  return request<T>(path, {
    ...init,
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function put<T>(path: string, body?: unknown, init?: RequestInit) {
  return request<T>(path, {
    ...init,
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function patch<T>(path: string, body?: unknown, init?: RequestInit) {
  return request<T>(path, {
    ...init,
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(path: string, init?: RequestInit) {
  return request<T>(path, { ...init, method: "DELETE" });
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("yb_token", token);
  } else {
    localStorage.removeItem("yb_token");
  }
}
