/*
 * Phase 7 — Consultation System Tests
 *
 * Tests:
 * 1. Patient creating a consultation
 * 2. Doctor viewing their consultations
 * 3. Unauthorized patient accessing another patient's consultation
 * 4. Doctor accepting a consultation
 * 5. Consultation completion flow
 * 6. Invalid status transitions
 */

import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Consultation from "../src/models/Consultation.js";
import { hashPassword } from "../src/services/passwordService.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-for-jwt-tests";

let apiServer, apiUrl;

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

async function getJSON(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiUrl}${path}`, { headers });
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

async function createUserAndLogin(fullName, email, role) {
  const password = "safe-password-123";
  const passwordHash = await hashPassword(password);
  await User.create({ fullName, email, passwordHash, role });
  const result = await postJSON("/api/auth/login", { email, password });
  return result.body.token;
}

before(async () => {
  if (!mongoUri) throw new Error("Set TEST_MONGODB_URI or MONGODB_URI.");
  await mongoose.connect(mongoUri);
  await mongoose.connection.db.dropDatabase();
  await User.init();

  apiServer = app.listen(0, "127.0.0.1");
  await once(apiServer, "listening");
  apiUrl = `http://127.0.0.1:${apiServer.address().port}`;
});

beforeEach(async () => {
  await User.deleteMany({});
  await Consultation.deleteMany({});
});

after(async () => {
  if (apiServer) await new Promise((r, j) => apiServer.close(e => e ? j(e) : r()));
  await mongoose.disconnect();
});

test("patient can request a consultation", async () => {
  const patientToken = await createUserAndLogin("Sam", "sam@example.test", "patient");
  const doctorHash = await hashPassword("safe-password-123");
  const doctor = await User.create({
    fullName: "Dr. Asha",
    email: "asha@example.test",
    passwordHash: doctorHash,
    role: "doctor"
  });

  const result = await postJSON("/api/consultations", {
    doctor: doctor._id.toString(),
    reason: "Routine check-up"
  }, patientToken);

  assert.equal(result.status, 201);
  assert.equal(result.body.data.status, "requested");
  assert.equal(result.body.data.reason, "Routine check-up");
});

test("doctor can view consultations assigned to them", async () => {
  const patientToken = await createUserAndLogin("Sam", "sam@example.test", "patient");
  const doctorHash = await hashPassword("safe-password-123");
  const doctor = await User.create({
    fullName: "Dr. Asha",
    email: "asha@example.test",
    passwordHash: doctorHash,
    role: "doctor"
  });
  const doctorToken = (await postJSON("/api/auth/login", {
    email: "asha@example.test",
    password: "safe-password-123"
  })).body.token;

  // Patient creates a consultation
  await postJSON("/api/consultations", {
    doctor: doctor._id.toString(),
    reason: "Check-up"
  }, patientToken);

  const result = await getJSON("/api/consultations/my", doctorToken);

  assert.equal(result.status, 200);
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].patient.fullName, "Sam");
});

test("unauthorized patient cannot access another patient's consultation", async () => {
  // Create patient1 and a consultation
  const patient1Token = await createUserAndLogin("Sam", "sam@example.test", "patient");
  const doctorHash = await hashPassword("safe-password-123");
  const doctor = await User.create({
    fullName: "Dr. Asha",
    email: "asha@example.test",
    passwordHash: doctorHash,
    role: "doctor"
  });

  const created = await postJSON("/api/consultations", {
    doctor: doctor._id.toString(),
    reason: "Private"
  }, patient1Token);

  // Create patient2
  const patient2Token = await createUserAndLogin("Alex", "alex@example.test", "patient");

  // Patient2 tries to access patient1's consultation
  const result = await getJSON(`/api/consultations/${created.body.data._id}`, patient2Token);

  assert.equal(result.status, 403);
  assert.equal(result.body.error, "Access denied");
});

test("doctor can accept then complete a consultation", async () => {
  const patientToken = await createUserAndLogin("Sam", "sam@example.test", "patient");
  const doctorHash = await hashPassword("safe-password-123");
  const doctor = await User.create({
    fullName: "Dr. Asha",
    email: "asha@example.test",
    passwordHash: doctorHash,
    role: "doctor"
  });
  const doctorToken = (await postJSON("/api/auth/login", {
    email: "asha@example.test",
    password: "safe-password-123"
  })).body.token;

  const created = await postJSON("/api/consultations", {
    doctor: doctor._id.toString()
  }, patientToken);

  const consultationId = created.body.data._id;

  // Accept
  const accepted = await patchJSON(
    `/api/consultations/${consultationId}/status`,
    { status: "accepted" },
    doctorToken
  );
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.data.status, "accepted");

  // Make active
  const active = await patchJSON(
    `/api/consultations/${consultationId}/status`,
    { status: "active" },
    doctorToken
  );
  assert.equal(active.status, 200);
  assert.equal(active.body.data.status, "active");

  // Complete
  const completed = await patchJSON(
    `/api/consultations/${consultationId}/status`,
    { status: "completed" },
    doctorToken
  );
  assert.equal(completed.status, 200);
  assert.equal(completed.body.data.status, "completed");
});

test("invalid status transition is rejected", async () => {
  const patientToken = await createUserAndLogin("Sam", "sam@example.test", "patient");
  const doctorHash = await hashPassword("safe-password-123");
  const doctor = await User.create({
    fullName: "Dr. Asha",
    email: "asha@example.test",
    passwordHash: doctorHash,
    role: "doctor"
  });
  const doctorToken = (await postJSON("/api/auth/login", {
    email: "asha@example.test",
    password: "safe-password-123"
  })).body.token;

  const created = await postJSON("/api/consultations", {
    doctor: doctor._id.toString()
  }, patientToken);

  // Try to complete a consultation that hasn't been accepted yet
  const result = await patchJSON(
    `/api/consultations/${created.body.data._id}/status`,
    { status: "completed" },
    doctorToken
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Invalid status transition");
});
