/*
 * Phase 11 — Guest Access Tests
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app.js";
import GuestProfile from "../src/models/GuestProfile.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "test-secret-for-jwt-tests";
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = JWT_SECRET;

let apiServer, apiUrl;

async function postJSON(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  if (!mongoUri) throw new Error("Set TEST_MONGODB_URI or MONGODB_URI.");
  await mongoose.connect(mongoUri);
  await mongoose.connection.db.dropDatabase();

  apiServer = app.listen(0, "127.0.0.1");
  await once(apiServer, "listening");
  apiUrl = `http://127.0.0.1:${apiServer.address().port}`;
});

beforeEach(async () => {
  await GuestProfile.deleteMany({});
});

after(async () => {
  if (apiServer) await new Promise((r, j) => apiServer.close(e => e ? j(e) : r()));
  await mongoose.disconnect();
});

test("guest access returns a short-lived token", async () => {
  const result = await postJSON("/api/guest/access", {
    name: "Emergency User",
    reason: "Urgent consultation"
  });

  assert.equal(result.status, 201);
  assert.ok(result.body.token, "Should receive a token");
  assert.equal(result.body.data.role, "guest");
  assert.ok(result.body.data.expiresAt, "Should have expiration");

  // Verify token contents
  const decoded = jwt.verify(result.body.token, JWT_SECRET);
  assert.equal(decoded.role, "guest");
  assert.ok(decoded.guestId, "Token should contain guestId");
});

test("guest access rejects invalid name", async () => {
  const result = await postJSON("/api/guest/access", { name: "A" });
  assert.equal(result.status, 400);
});

test("guest token has short expiration", async () => {
  const result = await postJSON("/api/guest/access", {
    name: "Emergency User"
  });

  const decoded = jwt.verify(result.body.token, JWT_SECRET);
  const expirationSeconds = decoded.exp - decoded.iat;

  // Should be 15 minutes (900 seconds) or less
  assert.ok(expirationSeconds <= 900, `Token expiration should be ≤ 900s, got ${expirationSeconds}s`);
});
