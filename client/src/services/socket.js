/*
 * Phase 8 — Socket Service
 *
 * Manages the Socket.io connection from the React frontend.
 * The socket is connected when the user logs in and disconnected on logout.
 * Sends the JWT token for authentication.
 */

import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket.id);
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
