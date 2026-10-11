/*
 * Phase 11 — Guest Profile Model
 *
 * WHY GUEST ACCESS?
 * In an emergency, a person might need immediate medical consultation
 * without the time to create a full account. Guest access provides
 * temporary, limited access for urgent situations.
 *
 * SECURITY CONSTRAINTS:
 * - Guest tokens expire quickly (15 minutes by default)
 * - Guests have minimal permissions (no admin, no arbitrary access)
 * - Only minimum information is stored
 * - Guest profiles are cleaned up by the background worker (Phase 12)
 *
 * NOTE ON STATEFULNESS:
 * JWT itself is a self-contained/stateless token — it carries all needed info.
 * However, the overall guest workflow depends on server-side state (this model)
 * because we need to track the guest identity and link it to consultations.
 * The JWT is still self-contained; the workflow uses server-side state.
 */

import mongoose from "mongoose";

const guestProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Guest name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [100, "Name cannot exceed 100 characters."]
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters."]
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const GuestProfile = mongoose.model("GuestProfile", guestProfileSchema);

export default GuestProfile;
