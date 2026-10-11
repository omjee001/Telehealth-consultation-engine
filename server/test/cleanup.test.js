/*
 * Phase 12 — Cleanup Worker Tests
 */

import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import mongoose from "mongoose";
import GuestProfile from "../src/models/GuestProfile.js";
import Consultation from "../src/models/Consultation.js";
import User from "../src/models/User.js";
import Message from "../src/models/Message.js";
import { hashPassword } from "../src/services/passwordService.js";
import { runCleanup } from "../src/workers/cleanupWorker.js";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = "test-secret-for-jwt-tests";

before(async () => {
  if (!mongoUri) throw new Error("Set TEST_MONGODB_URI or MONGODB_URI.");
  await mongoose.connect(mongoUri);
  await mongoose.connection.db.dropDatabase();
  await User.init();
});

beforeEach(async () => {
  await GuestProfile.deleteMany({});
  await Consultation.deleteMany({});
  await Message.deleteMany({});
  await User.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
});

test("cleanup removes expired guest profiles", async () => {
  // Create an expired guest
  await GuestProfile.create({
    name: "Expired Guest",
    expiresAt: new Date(Date.now() - 60000) // expired 1 minute ago
  });

  // Create a valid guest
  await GuestProfile.create({
    name: "Valid Guest",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
  });

  const result = await runCleanup();

  assert.equal(result.guestProfiles, 1, "Should remove 1 expired guest");
  assert.equal(await GuestProfile.countDocuments(), 1, "Should keep 1 valid guest");
});

test("cleanup removes old cancelled consultations but keeps completed ones", async () => {
  const passwordHash = await hashPassword("test-password-123");
  const patient = await User.create({
    fullName: "Sam",
    email: "sam@example.test",
    passwordHash,
    role: "patient"
  });
  const doctor = await User.create({
    fullName: "Dr. Asha",
    email: "asha@example.test",
    passwordHash,
    role: "doctor"
  });

  // Old cancelled consultation (should be cleaned up)
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await Consultation.create({
    patient: patient._id,
    doctor: doctor._id,
    status: "cancelled",
    updatedAt: thirtyOneDaysAgo
  });
  // Manually set updatedAt since Mongoose overrides it.
  // We must pass { timestamps: false } so Mongoose doesn't auto-set updatedAt again.
  await Consultation.updateOne(
    { status: "cancelled" },
    { $set: { updatedAt: thirtyOneDaysAgo } },
    { timestamps: false }
  );

  // Completed consultation (should be kept)
  await Consultation.create({
    patient: patient._id,
    doctor: doctor._id,
    status: "completed"
  });

  const result = await runCleanup();

  assert.equal(result.consultations, 1, "Should remove 1 cancelled consultation");
  assert.equal(await Consultation.countDocuments(), 1, "Should keep 1 completed consultation");
});

test("cleanup handles empty database gracefully", async () => {
  const result = await runCleanup();

  assert.equal(result.guestProfiles, 0);
  assert.equal(result.consultations, 0);
  assert.equal(result.errors.length, 0);
});
