/*
 * Phase 7 — Consultation Model
 *
 * CONSULTATION LIFECYCLE:
 *   Patient requests consultation  → status: "requested"
 *   Doctor accepts the request     → status: "accepted"
 *   Consultation becomes active    → status: "active"
 *   Consultation ends              → status: "completed"
 *   Either party cancels           → status: "cancelled"
 *
 * This is our reconstructed educational design, not a production medical system.
 */

import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient ID is required."]
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor ID is required."]
    },
    scheduledFor: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters."]
    },
    status: {
      type: String,
      enum: ["requested", "accepted", "active", "completed", "cancelled"],
      default: "requested"
    }
  },
  { timestamps: true }
);

const Consultation = mongoose.model("Consultation", consultationSchema);

export default Consultation;
