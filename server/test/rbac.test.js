/*
 * Phase 5 — RBAC Tests
 *
 * Tests the complete authentication + authorization chain:
 *
 *   JWT authentication (who are you?)
 *   +
 *   authorization middleware (what are you allowed to do?)
 *   =
 *   protected role-based endpoint
 *
 * Tests verify:
 * 1. Patient can access patient dashboard
 * 2. Patient CANNOT access doctor dashboard → 403
 * 3. Doctor can access doctor dashboard
 * 4. Patient CANNOT access admin dashboard → 403
 * 5. Admin can access admin dashboard
 * 6. Admin can access ALL dashboards (patient + doctor + admin)
 * 7. Missing JWT → 401
 * 8. Invalid JWT → 401
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { hashPassword } from "../src/services/passwordService.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-jwt-tests";
let apiServer;
let apiUrl;

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = JWT_SECRET;
}

async function postJSON(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

async function getWithToken(path, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${apiUrl}${path}`, { headers });
  return { status: response.status, body: await response.json() };
}

// Helper: create a user and return their login token
async function createUserAndLogin(fullName, email, role, password = "safe-password-123") {
  const passwordHash = await hashPassword(password);
  await User.create({ fullName, email, passwordHash, role });

  const loginResult = await postJSON("/api/auth/login", { email, password });
  return loginResult.body.token;
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
});

after(async () => {
  if (apiServer) {
    await new Promise((resolve, reject) => {
      apiServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await mongoose.disconnect();
});

// ─── Patient role tests ─────────────────────

test("patient can access patient dashboard", async () => {
  const token = await createUserAndLogin("Sam Patient", "sam@example.test", "patient");
  const result = await getWithToken("/api/protected/patient/dashboard", token);

  assert.equal(result.status, 200);
  assert.equal(result.body.message, "Welcome to the patient dashboard.");
  assert.equal(result.body.data.role, "patient");
});

test("patient CANNOT access doctor-only dashboard", async () => {
  const token = await createUserAndLogin("Sam Patient", "sam@example.test", "patient");
  const result = await getWithToken("/api/protected/doctor/dashboard", token);

  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Access denied");
});

test("patient CANNOT access admin dashboard", async () => {
  const token = await createUserAndLogin("Sam Patient", "sam@example.test", "patient");
  const result = await getWithToken("/api/protected/admin/dashboard", token);

  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Access denied");
});

// ─── Doctor role tests ─────────────────────

test("doctor can access doctor dashboard", async () => {
  const token = await createUserAndLogin("Dr. Asha", "asha@example.test", "doctor");
  const result = await getWithToken("/api/protected/doctor/dashboard", token);

  assert.equal(result.status, 200);
  assert.equal(result.body.message, "Welcome to the doctor dashboard.");
  assert.equal(result.body.data.role, "doctor");
});

test("doctor CANNOT access admin dashboard", async () => {
  const token = await createUserAndLogin("Dr. Asha", "asha@example.test", "doctor");
  const result = await getWithToken("/api/protected/admin/dashboard", token);

  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Access denied");
});

// ─── Admin role tests ─────────────────────

test("admin can access admin dashboard", async () => {
  const token = await createUserAndLogin("System Admin", "admin@example.test", "admin");
  const result = await getWithToken("/api/protected/admin/dashboard", token);

  assert.equal(result.status, 200);
  assert.equal(result.body.message, "Welcome to the admin dashboard.");
  assert.equal(result.body.data.role, "admin");
});

test("admin can access patient dashboard (cross-role access)", async () => {
  const token = await createUserAndLogin("System Admin", "admin@example.test", "admin");
  const result = await getWithToken("/api/protected/patient/dashboard", token);

  assert.equal(result.status, 200);
  assert.equal(result.body.data.role, "admin");
});

test("admin can access doctor dashboard (cross-role access)", async () => {
  const token = await createUserAndLogin("System Admin", "admin@example.test", "admin");
  const result = await getWithToken("/api/protected/doctor/dashboard", token);

  assert.equal(result.status, 200);
  assert.equal(result.body.data.role, "admin");
});

// ─── Missing / invalid JWT ─────────────────

test("request without token returns 401", async () => {
  const result = await getWithToken("/api/protected/patient/dashboard", null);

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Authentication required");
});

test("request with invalid token returns 401", async () => {
  const result = await getWithToken("/api/protected/patient/dashboard", "fake-token");

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Invalid token");
});
