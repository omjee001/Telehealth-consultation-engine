/*
 * Phase 5 — Admin Seed Script
 *
 * WHY THIS EXISTS:
 * Public registration blocks the "admin" role for security.
 * But we need admin accounts for testing RBAC.
 * This script creates an admin user directly in the database.
 *
 * In a production system, admin accounts would be created through
 * a controlled setup process (CLI tool, migration script, or
 * a super-admin panel — never through public registration).
 *
 * Usage:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/telehealth_engine node scripts/seedAdmin.js
 */

import mongoose from "mongoose";
import User from "../src/models/User.js";
import { hashPassword } from "../src/services/passwordService.js";
import "dotenv/config";

const mongoUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("Set MONGODB_URI or TEST_MONGODB_URI before running this script.");
  process.exit(1);
}

async function seedAdmin() {
  await mongoose.connect(mongoUri);

  const adminEmail = "admin@telehealth.test";
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    console.log(`Admin already exists: ${adminEmail}`);
  } else {
    const passwordHash = await hashPassword("admin-password-123");
    await User.create({
      fullName: "System Admin",
      email: adminEmail,
      passwordHash,
      role: "admin"
    });
    console.log(`Admin created: ${adminEmail} (password: admin-password-123)`);
  }

  await mongoose.disconnect();
}

seedAdmin().catch((error) => {
  console.error("Failed to seed admin:", error.message);
  process.exit(1);
});
