import bcrypt from "bcryptjs";

const saltRounds = 12;

// bcrypt creates a new random salt for every call.
export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, saltRounds);
}

// This will be used during login in a later phase.
export function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
