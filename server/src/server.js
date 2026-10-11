/*
 * Phase 8 — Server Entry Point (updated for Socket.io)
 *
 * Previously, app.listen() created the HTTP server automatically.
 * Now we create the HTTP server ourselves so we can attach Socket.io to it.
 *
 * The flow is:
 *   1. Create HTTP server from Express app
 *   2. Attach Socket.io to that HTTP server
 *   3. Set up socket event handlers
 *   4. Start listening
 *
 * Both REST API requests and WebSocket connections share the same port.
 */

import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import connectDatabase from "./config/database.js";
import env from "./config/env.js";
import setupSocket from "./sockets/socketHandler.js";
import { startCleanupWorker } from "./workers/cleanupWorker.js";
import { getRedisClient } from "./config/redis.js";

async function startServer() {
  try {
    await connectDatabase();

    // Create HTTP server from Express app
    const httpServer = createServer(app);

    // Attach Socket.io to the HTTP server
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.clientUrl,
        methods: ["GET", "POST"]
      }
    });

    // Set up socket event handlers
    setupSocket(io);

    // Make io accessible from app (for routes that need to emit events)
    app.set("io", io);

    httpServer.listen(env.port, () => {
      console.log(`Telehealth API is running at http://localhost:${env.port}`);
      console.log(`Socket.io is ready for real-time connections.`);
      
      // Start the background worker for cleaning up stale guest data
      startCleanupWorker();
      
      // Initialize Redis connection (non-blocking)
      getRedisClient();
    });
  } catch (error) {
    console.error("Unable to start the server because MongoDB did not connect.");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
