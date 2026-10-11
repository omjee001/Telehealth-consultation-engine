import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { verifyPassword } from "../src/services/passwordService.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
let apiServer;
let apiUrl;

async function register(body) {
  const response = await fetch(`${apiUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

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

test("registers a patient and stores only a bcrypt password hash", async () => {
  const password = "correct-horse-battery-staple";
  const result = await register({
    fullName: "Sam Patient",
    email: "sam.patient@example.test",
    password
  });

  assert.equal(result.status, 201);
  assert.equal(result.body.data.role, "patient");
  assert.equal("passwordHash" in result.body.data, false);

  const storedUser = await User.findOne({ email: "sam.patient@example.test" }).select("+passwordHash");
  assert.notEqual(storedUser.passwordHash, password);
  assert.equal(await verifyPassword(password, storedUser.passwordHash), true);
});

test("rejects duplicate email addresses", async () => {
  const body = {
    fullName: "Sam Patient",
    email: "duplicate@example.test",
    password: "safe-password-123"
  };

  await register(body);
  const duplicate = await register(body);

  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, "Duplicate value");
});

test("rejects invalid registration input", async () => {
  const result = await register({
    fullName: "A",
    email: "not-an-email",
    password: "safe-password-123"
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "Validation failed");
});

test("allows Doctor registration but blocks Admin self-registration", async () => {
  const doctor = await register({
    fullName: "Dr. Asha Patel",
    email: "asha.patel@example.test",
    password: "safe-password-123",
    role: "doctor"
  });
  const admin = await register({
    fullName: "Untrusted Admin",
    email: "admin@example.test",
    password: "safe-password-123",
    role: "admin"
  });

  assert.equal(doctor.status, 201);
  assert.equal(doctor.body.data.role, "doctor");
  assert.equal(admin.status, 403);
  assert.equal(admin.body.error, "Admin registration is not allowed");
});
