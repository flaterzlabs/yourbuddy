import { io, type Socket } from "socket.io-client";

const DEFAULT_DEV_API_BASE_URL = "http://localhost:4000";

const rawEnvBaseUrl =
  typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL.trim() : "";
const API_BASE_URL =
  rawEnvBaseUrl || (import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : "");
const HAS_API_BASE_URL = Boolean(API_BASE_URL);

if (!rawEnvBaseUrl && import.meta.env.DEV) {
  console.info(
    `[realtime] VITE_API_BASE_URL não configurada. Usando padrão ${DEFAULT_DEV_API_BASE_URL} em desenvolvimento.`,
  );
}
const REALTIME_PATH = "/realtime";

let socket: Socket | null = null;

export function connectRealtime(token: string) {
  if (!HAS_API_BASE_URL) {
    console.warn("VITE_API_BASE_URL não configurada para realtime");
    return null;
  }

  if (socket) {
    if (socket.auth?.token !== token) {
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }

  socket = io(API_BASE_URL, {
    path: REALTIME_PATH,
    auth: { token },
    transports: ["websocket"],
  });

  return socket;
}

export function getRealtimeSocket() {
  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
