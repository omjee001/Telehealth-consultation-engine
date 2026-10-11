/*
 * Phase 15 — Failure Handling & Edge Cases
 *
 * WHY IS FAILURE HANDLING IMPORTANT?
 *
 * 1. Security: Proper failure handling prevents information leakage. For example,
 *    we don't want to tell an attacker *why* a token failed, just that they are
 *    Unauthorized (401). We also prevent unauthorized users from accessing
 *    resources they shouldn't (403 Forbidden).
 *
 * 2. Robustness: Systems fail. Databases go down, tokens expire, clients send
 *    malformed data. A robust API gracefully rejects bad requests (400 Bad Request)
 *    and prevents the server from crashing.
 *
 * 3. User Experience: Returning appropriate HTTP status codes and clear error
 *    messages helps frontend developers build better UIs.
 *
 * 4. Data Integrity: By preventing invalid state transitions (e.g., jumping from
 *    'requested' directly to 'completed'), we maintain the integrity of our data.
 *
 * WHAT WE TEST:
 *   1. Expired JWT → 401
 *   2. Invalid JWT → 401
 *   3. Patient accessing admin dashboard → 403
 *   4. Duplicate registration → 409
 *   5. Invalid registration input → 400
 *   6. Missing auth header → 401
 *   7. Invalid ObjectId in consultation → 400
 *   8. Self-consultation → 400
 *   9. Invalid status transition → 400
 *  10. Access another user's consultation → 403
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Consultation from "../src/models/Consultation.js";
import { hashPassword } from "../src/services/passwordService.js";
import { generateToken } from "../src/services/tokenService.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-jwt-tests";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = JWT_SECRET;
}

let apiServer;
let apiUrl;
let patientUser;
let patientToken;
let doctorUser;
let doctorToken;

async function getJSON(path, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiUrl}${path}`, { headers });
  return { status: response.status, body: await response.json() };
}

async function postJSON(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function patchJSON(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiUrl}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  if (!mongoUri) {
    throw new Error("Set TEST_MONGODB_URI or MONGODB_URI before running tests.");
  }
  await mongoose.connect(mongoUri);
  await mongoose.connection.db.dropDatabase();
  await User.init();

  apiServer = app.listen(0, "127.0.0.1");
  await once(apiServer, "listening");
  const { port } = apiServer.address();
  apiUrl = `http://127.0.0.1:${port}`;
});

beforeEach(async () => {
  await User.deleteMany({});
  await Consultation.deleteMany({});

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
});

after(async () => {
  if (apiServer) {
    await new Promise((resolve, reject) => {
      apiServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await mongoose.disconnect();
});

// ── 1. Expired JWT → 401 ──

test("expired JWT is rejected with 401", async () => {
  const expiredToken = jwt.sign(
    { userId: patientUser._id, role: "patient" },
    JWT_SECRET,
    { expiresIn: "-10s" }
  );

  const result = await getJSON("/api/protected/me", expiredToken);
  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Token expired");
});

// ── 2. Invalid JWT → 401 ──

test("garbage JWT string is rejected with 401", async () => {
  const result = await getJSON("/api/protected/me", "not-a-valid-jwt-at-all");
  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Invalid token");
});

// ── 3. Patient accessing admin dashboard → 403 ──

test("patient cannot access admin dashboard", async () => {
  const result = await getJSON("/api/protected/admin/dashboard", patientToken);
  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Access denied");
});

// ── 4. Duplicate registration → 409 ──

test("duplicate email registration returns 409", async () => {
  const result = await postJSON("/api/auth/register", {
    fullName: "Another Person",
    email: "sam.patient@example.test",
    password: "different-password-123"
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "Duplicate value");
});

// ── 5. Invalid registration input → 400 ──

test("invalid registration input returns 400", async () => {
  const result = await postJSON("/api/auth/register", {
    fullName: "A",
    email: "not-an-email",
    password: "short"
  });
  assert.equal(result.status, 400);
});

// ── 6. Missing auth header → 401 ──

test("missing Authorization header returns 401", async () => {
  const result = await getJSON("/api/protected/me", null);
  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Authentication required");
});

// ── 7. Invalid ObjectId in consultation → 400 ──

test("invalid ObjectId for doctor returns 400", async () => {
  const result = await postJSON("/api/consultations", {
    doctor: "invalid-id-value"
  }, patientToken);
  assert.equal(result.status, 400);
});

// ── 8. Self-consultation → 400 ──

test("patient cannot create consultation with themselves", async () => {
  const result = await postJSON("/api/consultations", {
    doctor: patientUser._id.toString()
  }, patientToken);
  assert.equal(result.status, 400);
  assert.match(result.body.message, /yourself/i);
});

// ── 9. Invalid status transition → 400 ──

test("cannot skip from requested to completed", async () => {
  const consultation = await Consultation.create({
    patient: patientUser._id,
    doctor: doctorUser._id,
    status: "requested"
  });

  const result = await patchJSON(
    `/api/consultations/${consultation._id}/status`,
    { status: "completed" },
    doctorToken
  );
  assert.equal(result.status, 400);
  assert.match(result.body.error, /Invalid status transition/i);
});

// ── 10. Access another user's consultation → 403 ──

test("patient cannot view another patient's consultation", async () => {
  const otherPasswordHash = await hashPassword("other-password-123");
  const otherPatient = await User.create({
    fullName: "Other Patient",
    email: "other.patient@example.test",
    passwordHash: otherPasswordHash,
    role: "patient"
  });

  const consultation = await Consultation.create({
    patient: otherPatient._id,
    doctor: doctorUser._id,
    status: "requested"
  });

  const result = await getJSON(
    `/api/consultations/${consultation._id}`,
    patientToken
  );
  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Access denied");
});
