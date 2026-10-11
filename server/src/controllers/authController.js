/*
 * Phase 3 + Phase 4 — Auth Controller
 *
 * REGISTRATION (Phase 3):
 *   Client sends fullName, email, password, role
 *   → validate input
 *   → block admin self-registration
 *   → hash password with bcrypt
 *   → save user to MongoDB
 *   → return safe user data (no passwordHash)
 *
 * LOGIN (Phase 4):
 *   Client sends email and password
 *   → find user by email
 *   → verify password against bcrypt hash
 *   → generate JWT
 *   → return token
 *
 * SECURITY NOTE:
 * When login fails, we return the same generic message for both
 * "email not found" and "wrong password". This is intentional.
 * If we said "email not found", an attacker would know which emails
 * have accounts — that information leak is called "user enumeration".
 */

import User from "../models/User.js";
import { hashPassword, verifyPassword } from "../services/passwordService.js";
import { generateToken } from "../services/tokenService.js";

const publicRegistrationRoles = ["patient", "doctor"];

export async function register(request, response, next) {
  try {
    const { fullName, email, password } = request.body;
    const role = request.body.role ?? "patient";

    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return response.status(400).json({
        error: "Invalid password",
        message: "Password must be between 8 and 72 characters."
      });
    }

    if (role === "admin") {
      return response.status(403).json({
        error: "Admin registration is not allowed",
        message: "Admin accounts must be created through a controlled setup process."
      });
    }

    if (!publicRegistrationRoles.includes(role)) {
      return response.status(400).json({
        error: "Invalid role",
        message: "Public registration supports only patient or doctor roles."
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ fullName, email, passwordHash, role });

    return response.status(201).json({
      message: "Registration successful.",
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(request, response, next) {
  try {
    const { email, password } = request.body;

    // Step 1: Validate that both fields were provided
    if (!email || !password) {
      return response.status(400).json({
        error: "Missing credentials",
        message: "Email and password are required."
      });
    }

    // Step 2: Find the user by email.
    // We need "+passwordHash" because the User schema has `select: false` on that field,
    // meaning normal queries never include it. We explicitly ask for it here.
    const user = await User.findOne({ email }).select("+passwordHash");

    // Step 3: Verify the password.
    // We use the same error message whether the user doesn't exist or the password
    // is wrong. This prevents "user enumeration" attacks.
    if (!user) {
      return response.status(401).json({
        error: "Login failed",
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      return response.status(401).json({
        error: "Login failed",
        message: "Invalid email or password."
      });
    }

    // Step 4: Password is correct — generate a JWT for this user.
    const token = generateToken(user);

    // Step 5: Return the token and safe user data (passwordHash is excluded by toJSON)
    return response.status(200).json({
      message: "Login successful.",
      token,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

