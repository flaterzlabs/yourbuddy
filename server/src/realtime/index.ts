import type { Server, Socket } from "socket.io";

let ioRef: Server | null = null;

export function registerRealtimeHandlers(io: Server) {
  ioRef = io;

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as
      | {
          id: string;
          email: string;
          role: "student" | "caregiver" | "educator";
        }
      | undefined;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${user.id}`);

    if (user.role === "caregiver") {
      socket.join(`caregiver:${user.id}`);
    }
    if (user.role === "student") {
      socket.join(`student:${user.id}`);
      socket.join("broadcast:help_requests");
    }

    socket.on("disconnect", () => {
      // No-op, but kept for visibility
    });
  });
}

export function emitToRoom(room: string, event: string, payload: unknown) {
  ioRef?.to(room).emit(event, payload);
}

export function broadcast(event: string, payload: unknown) {
  ioRef?.emit(event, payload);
}
