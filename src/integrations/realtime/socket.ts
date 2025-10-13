import { io, type Socket } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const REALTIME_PATH = "/realtime";

let socket: Socket | null = null;

export function connectRealtime(token: string) {
  if (!API_BASE_URL) {
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
