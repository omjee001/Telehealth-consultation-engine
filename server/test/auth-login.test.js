/*
 * Phase 4 — Login + JWT Tests
 *
 * Tests verify:
 * 1. Successful login returns a JWT token
 * 2. Wrong password returns 401
 * 3. Unknown email returns 401
 * 4. Missing credentials return 400
 * 5. Protected endpoint works with valid token
 * 6. Missing token returns 401
 * 7. Invalid token returns 401
 * 8. Expired token returns 401
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { hashPassword } from "../src/services/passwordService.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-jwt-tests";
let apiServer;
let apiUrl;

// Set JWT_SECRET for tests if not set
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
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${apiUrl}${path}`, { headers });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  if (!mongoUri) {
    throw new Error("Set TEST_MONGODB_URI or MONGODB_URI before running database tests.");
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

// Helper: create a test user directly in the database
async function createTestUser(overrides = {}) {
  const defaults = {
    fullName: "Sam Patient",
    email: "sam.patient@example.test",
    role: "patient"
  };
  const password = overrides.plainPassword || "correct-horse-battery-staple";
  const passwordHash = await hashPassword(password);

  const userData = { ...defaults, ...overrides, passwordHash };
  delete userData.plainPassword;

  return User.create(userData);
}

test("successful login returns a JWT token and user data", async () => {
  const password = "correct-horse-battery-staple";
  await createTestUser({ plainPassword: password });

  const result = await postJSON("/api/auth/login", {
    email: "sam.patient@example.test",
    password
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.message, "Login successful.");
  assert.ok(result.body.token, "Response should include a token");
  assert.equal(result.body.data.email, "sam.patient@example.test");
  assert.equal(result.body.data.role, "patient");
  assert.equal("passwordHash" in result.body.data, false, "Password hash must not be in response");

  // Verify the token is a valid JWT
  const decoded = jwt.verify(result.body.token, JWT_SECRET);
  assert.ok(decoded.userId, "Token payload should contain userId");
  assert.equal(decoded.role, "patient");
  assert.ok(decoded.exp, "Token should have an expiration");
});

test("login with wrong password returns 401", async () => {
  await createTestUser({ plainPassword: "correct-password-123" });

  const result = await postJSON("/api/auth/login", {
    email: "sam.patient@example.test",
    password: "wrong-password-456"
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Login failed");
  // Same message for wrong password and unknown user (prevents user enumeration)
  assert.equal(result.body.message, "Invalid email or password.");
});

test("login with unknown email returns 401", async () => {
  const result = await postJSON("/api/auth/login", {
    email: "nobody@example.test",
    password: "some-password-123"
  });

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Login failed");
  assert.equal(result.body.message, "Invalid email or password.");
});

test("login with missing credentials returns 400", async () => {
  const result = await postJSON("/api/auth/login", {});

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Missing credentials");
});

test("protected /me endpoint works with valid token", async () => {
  const password = "correct-horse-battery-staple";
  const user = await createTestUser({ plainPassword: password });

  const loginResult = await postJSON("/api/auth/login", {
    email: "sam.patient@example.test",
    password
  });

  const result = await getWithToken("/api/protected/me", loginResult.body.token);

  assert.equal(result.status, 200);
  assert.equal(result.body.data.userId, user._id.toString());
  assert.equal(result.body.data.role, "patient");
});

test("protected endpoint rejects missing token", async () => {
  const result = await getWithToken("/api/protected/me", null);

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Authentication required");
});

test("protected endpoint rejects invalid token", async () => {
  const result = await getWithToken("/api/protected/me", "not-a-valid-token");

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Invalid token");
});

test("protected endpoint rejects expired token", async () => {
  const user = await createTestUser();

  // Create a token that expired 10 seconds ago
  const expiredToken = jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: "-10s" }
  );

  const result = await getWithToken("/api/protected/me", expiredToken);

  assert.equal(result.status, 401);
  assert.equal(result.body.error, "Token expired");
});
