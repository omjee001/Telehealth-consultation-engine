/*
 * Phase 8 — Socket.io Handler
 *
 * HTTP vs WebSockets:
 *
 *   HTTP (what we've used so far):
 *     Client → Request → Server
 *     Client ← Response ← Server
 *     Connection closes. For new data, client must ask again.
 *
 *   WebSocket (real-time):
 *     Client ←→ Server
 *     Connection stays OPEN. Either side can send data at any time.
 *     No need to keep asking "any new messages?"
 *
 * WHY POLLING IS BAD:
 * Without WebSockets, a chat app would need to keep asking the server
 * "any new messages?" every few seconds (polling). This wastes bandwidth,
 * creates delays, and puts unnecessary load on the server.
 *
 * SOCKET.IO:
 * Socket.io is a library that makes WebSocket connections easy.
 * It handles reconnection, fallbacks, and provides a simple event system.
 *
 * KEY CONCEPTS:
 * - Socket: one connection between a client and the server
 * - Socket ID: a unique identifier for each connection (e.g. "abc123")
 * - Events: named messages that either side can emit or listen for
 * - Connection: when a client first connects
 * - Disconnect: when a client leaves (closes browser, network drops, etc.)
 * - Rooms: groups of sockets that can receive messages together
 *
 * Phase 9 adds authenticated messaging.
 * Phase 10 adds presence and typing indicators.
 */

import { verifyToken } from "../services/tokenService.js";
import { setupMessageHandler } from "./messageHandler.js";
import { setupPresenceHandler, onlineUsers } from "./presenceHandler.js";

// Track authenticated sockets for message routing
export const authenticatedSockets = new Map(); // userId → Set<socketId>

export default function setupSocket(io) {
  // ── Socket Authentication Middleware (Phase 9) ──
  // Verify JWT before allowing the connection.
  // The token is sent as a query parameter or in auth headers.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication required — no token provided."));
    }

    try {
      const decoded = verifyToken(token);
      socket.user = {
        userId: decoded.userId || decoded.guestId,
        role: decoded.role,
        isGuest: !!decoded.guestId
      };
      return next();
    } catch (error) {
      return next(new Error("Authentication failed — invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.userId;

    console.log(`[Socket] Connected: ${socket.id} (user: ${userId}, role: ${socket.user.role})`);

    // Track this socket
    if (!authenticatedSockets.has(userId)) {
      authenticatedSockets.set(userId, new Set());
    }
    authenticatedSockets.get(userId).add(socket.id);

    // ── Phase 8: Simple test event ──
    socket.on("ping", (callback) => {
      console.log(`[Socket] Ping from ${socket.id}`);
      if (typeof callback === "function") {
        callback({ message: "pong", socketId: socket.id });
      } else {
        socket.emit("pong", { message: "pong", socketId: socket.id });
      }
    });

    // ── Phase 9: Message handling ──
    setupMessageHandler(io, socket);

    // ── Phase 10: Presence handling ──
    setupPresenceHandler(io, socket);

    // ── Disconnect ──
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (reason: ${reason})`);

      // Remove from tracking
      const userSockets = authenticatedSockets.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          authenticatedSockets.delete(userId);
        }
      }
    });
  });
}
