import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { registerRealtimeHandlers } from "./realtime/index.js";

const env = loadEnv();
const { app, authMiddleware } = createApp();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/realtime",
  cors: {
    origin: env.corsOrigins,
    credentials: true,
  },
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const user = await authMiddleware.verifyToken(token);
    socket.data.user = user;
    next();
  } catch (error) {
    next(error as Error);
  }
});

registerRealtimeHandlers(io);

httpServer.listen(env.port, () => {
  console.log(`API listening on port ${env.port}`);
});
