/*
 * Phase 16 — Socket.io Integration Tests
 *
 * WHY TEST WEBSOCKETS?
 *
 * 1. Statefulness: Unlike HTTP, WebSockets maintain a persistent connection.
 *    We must ensure connections are established, authenticated properly, and
 *    cleaned up correctly.
 *
 * 2. Asynchronous Events: Socket events happen asynchronously. We need to test
 *    that emitting an event triggers the correct database updates and broadcasts
 *    to other clients.
 *
 * 3. Security: Just like HTTP endpoints, Socket events need authorization. A user
 *    should not be able to join a room (consultation) they don't belong to.
 *
 * HOW THIS WORKS:
 *   We create an HTTP server, attach Socket.io, and connect test clients.
 *   Each test creates a socket.io-client connection with a JWT for authentication.
 *   We verify that events are handled correctly on the server side.
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { io as ioc } from "socket.io-client";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Consultation from "../src/models/Consultation.js";
import Message from "../src/models/Message.js";
import { hashPassword } from "../src/services/passwordService.js";
import { generateToken } from "../src/services/tokenService.js";
import setupSocket from "../src/sockets/socketHandler.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-jwt-tests";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = JWT_SECRET;
}

let httpServer;
let io;
let serverPort;
let patientUser;
let patientToken;
let doctorUser;
let doctorToken;
let otherPatientUser;
let otherPatientToken;
let consultationDoc;

// Track all client sockets so we can disconnect them in cleanup
const clientSockets = [];

function createClientSocket(token) {
  const options = {
    transports: ["websocket", "polling"],
    autoConnect: false,
    forceNew: true
  };
  if (token) {
    options.auth = { token };
  }
  const socket = ioc(`http://127.0.0.1:${serverPort}`, options);
  clientSockets.push(socket);
  return socket;
}

function waitForConnect(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Connection timeout")), 3000);
    socket.on("connect", () => { clearTimeout(timer); resolve(); });
    socket.on("connect_error", (err) => { clearTimeout(timer); reject(err); });
  });
}

function waitForConnectError(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Expected connect_error but timed out")), 3000);
    socket.on("connect_error", (err) => { clearTimeout(timer); resolve(err); });
    socket.on("connect", () => { clearTimeout(timer); reject(new Error("Should not have connected")); });
  });
}

before(async () => {
  if (!mongoUri) {
    throw new Error("Set TEST_MONGODB_URI or MONGODB_URI before running tests.");
  }
  await mongoose.connect(mongoUri);
  await mongoose.connection.db.dropDatabase();

  // Create the HTTP + Socket.io server manually (not using server.js which calls connectDatabase)
  httpServer = createServer(app);
  io = new SocketIOServer(httpServer);
  setupSocket(io);

  await new Promise((resolve) => {
    httpServer.listen(0, "127.0.0.1", () => {
      serverPort = httpServer.address().port;
      resolve();
    });
  });
});

beforeEach(async () => {
  await User.deleteMany({});
  await Consultation.deleteMany({});
  await Message.deleteMany({});

  // Disconnect any lingering client sockets from previous tests
  for (const s of clientSockets) {
    if (s.connected) s.disconnect();
  }
  clientSockets.length = 0;

  const passwordHash = await hashPassword("correct-horse-battery-staple");

  patientUser = await User.create({
    fullName: "Sam Patient",
    email: "sam.patient@example.test",
    passwordHash,
    role: "patient"
  });
  patientToken = generateToken(patientUser);

  doctorUser = await User.create({
    fullName: "Dr. Asha Patel",
    email: "asha.patel@example.test",
    passwordHash,
    role: "doctor"
  });
  doctorToken = generateToken(doctorUser);

  otherPatientUser = await User.create({
    fullName: "Other Patient",
    email: "other.patient@example.test",
    passwordHash,
    role: "patient"
  });
  otherPatientToken = generateToken(otherPatientUser);

  consultationDoc = await Consultation.create({
    patient: patientUser._id,
    doctor: doctorUser._id,
    status: "accepted"
  });
});

after(async () => {
  for (const s of clientSockets) {
    if (s.connected) s.disconnect();
  }
  if (io) io.close();
  if (httpServer) httpServer.close();
  await mongoose.disconnect();
});

// ── 1. Connection with valid token ──

test("socket connects with a valid JWT token", async () => {
  const socket = createClientSocket(patientToken);
  socket.connect();
  await waitForConnect(socket);

  assert.equal(socket.connected, true);
  socket.disconnect();
});

// ── 2. Connection rejected without token ──

test("socket connection is rejected without a token", async () => {
  const socket = createClientSocket(null);
  socket.connect();

  const err = await waitForConnectError(socket);
  assert.ok(err, "Should receive a connect_error");
  assert.ok(err.message.includes("Authentication"), "Error should mention authentication");
});

// ── 3. Connection rejected with invalid token ──

test("socket connection is rejected with an invalid token", async () => {
  const socket = createClientSocket("this-is-not-a-jwt");
  socket.connect();

  const err = await waitForConnectError(socket);
  assert.ok(err, "Should receive a connect_error");
  assert.ok(err.message.includes("Authentication"), "Error should mention authentication");
});

// ── 4. joinConsultation authorization — participant succeeds ──

test("patient can join their own consultation", async () => {
  const socket = createClientSocket(patientToken);
  socket.connect();
  await waitForConnect(socket);

  const result = await new Promise((resolve) => {
    socket.emit("joinConsultation", consultationDoc._id.toString(), resolve);
  });

  assert.equal(result.success, true);
  assert.ok(Array.isArray(result.messages));
  socket.disconnect();
});

// ── 5. joinConsultation authorization — non-participant rejected ──

test("unauthorized user cannot join another's consultation", async () => {
  const socket = createClientSocket(otherPatientToken);
  socket.connect();
  await waitForConnect(socket);

  const result = await new Promise((resolve) => {
    socket.emit("joinConsultation", consultationDoc._id.toString(), resolve);
  });

  assert.ok(result.error, "Should receive an error");
  assert.ok(result.error.includes("not authorized"), "Error should mention authorization");
  socket.disconnect();
});

// ── 6. sendMessage — persist and deliver ──

test("participant can send a message that is persisted to MongoDB", async () => {
  const socket = createClientSocket(patientToken);
  socket.connect();
  await waitForConnect(socket);

  // Join first
  await new Promise((resolve) => {
    socket.emit("joinConsultation", consultationDoc._id.toString(), resolve);
  });

  // Send message
  const sendResult = await new Promise((resolve) => {
    socket.emit("sendMessage", {
      consultationId: consultationDoc._id.toString(),
      content: "Hello doctor!"
    }, resolve);
  });

  assert.equal(sendResult.success, true);
  assert.ok(sendResult.message, "Should return the message data");
  assert.equal(sendResult.message.content, "Hello doctor!");

  // Verify in database
  const dbMessages = await Message.find({ consultation: consultationDoc._id });
  assert.equal(dbMessages.length, 1);
  assert.equal(dbMessages[0].content, "Hello doctor!");
  assert.equal(dbMessages[0].sender.toString(), patientUser._id.toString());

  socket.disconnect();
});

// ── 7. sendMessage — unauthorized user rejected ──

test("non-participant cannot send message to consultation", async () => {
  const socket = createClientSocket(otherPatientToken);
  socket.connect();
  await waitForConnect(socket);

  const sendResult = await new Promise((resolve) => {
    socket.emit("sendMessage", {
      consultationId: consultationDoc._id.toString(),
      content: "Sneaky message"
    }, resolve);
  });

  assert.ok(sendResult.error, "Should receive an error");

  // Verify NOT in database
  const dbMessages = await Message.find({ consultation: consultationDoc._id });
  assert.equal(dbMessages.length, 0);

  socket.disconnect();
});
