/*
 * Phase 10 — Presence + Typing Handler
 *
 * ONLINE/OFFLINE PRESENCE:
 *   userId → active socket connections
 *
 * We use an in-memory Map to track which users are currently connected.
 * Map structure: userId → Set of socketIds
 *
 * A user is "online" when they have at least one active socket connection.
 * A user is "offline" when all their socket connections are closed.
 *
 * WHY A SET OF SOCKET IDS?
 * A user might have multiple tabs/devices open. Each creates a separate socket.
 * We track ALL of them. The user is only "offline" when ALL sockets disconnect.
 *
 * TYPING INDICATORS:
 *   Patient starts typing → socket event → server → doctor receives typing event
 *   Patient stops typing  → socket event → server → doctor receives stopTyping event
 *
 * Typing status is NOT persisted in MongoDB because:
 * 1. It's extremely temporary (seconds, not hours)
 * 2. It changes constantly — storing it would waste database writes
 * 3. It's only useful in real-time — historical typing data has no value
 *
 * ⚠️ IMPORTANT LIMITATIONS OF IN-MEMORY PRESENCE:
 * 1. Server restart → all presence data is lost, everyone appears offline
 * 2. Multiple backend servers → each server only knows about its own connections
 * 3. Multiple devices/tabs → handled within one server, but not across servers
 *
 * For production with multiple servers, you'd use Redis (Phase 13) to share
 * presence state across all server instances.
 */

// In-memory presence store: userId → Set<socketId>
export const onlineUsers = new Map();

export function setupPresenceHandler(io, socket) {
  const userId = socket.user.userId;

  // ── User comes online ──
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Broadcast that this user is online
  io.emit("userOnline", { userId });
  console.log(`[Presence] ${userId} is online (${onlineUsers.get(userId).size} connection(s))`);

  // ── Request online users list ──
  socket.on("getOnlineUsers", (callback) => {
    const onlineUserIds = Array.from(onlineUsers.keys());
    callback?.({ users: onlineUserIds });
  });

  // ── Typing indicator ──
  socket.on("typing", (data) => {
    const { consultationId } = data || {};
    if (!consultationId) return;

    // Send typing event to everyone in the consultation room EXCEPT the sender
    const roomName = `consultation:${consultationId}`;
    socket.to(roomName).emit("userTyping", {
      userId,
      consultationId
    });
  });

  socket.on("stopTyping", (data) => {
    const { consultationId } = data || {};
    if (!consultationId) return;

    const roomName = `consultation:${consultationId}`;
    socket.to(roomName).emit("userStoppedTyping", {
      userId,
      consultationId
    });
  });

  // ── User disconnects ──
  socket.on("disconnect", () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);

      // Only mark offline when ALL connections are gone
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("userOffline", { userId });
        console.log(`[Presence] ${userId} is offline`);
      } else {
        console.log(`[Presence] ${userId} still has ${userSockets.size} connection(s)`);
      }
    }
  });
}
