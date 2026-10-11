/*
 * Phase 7 — Consultation Controller (with authorization)
 *
 * AUTHORIZATION RULES:
 *   - Patients can request consultations and view their own
 *   - Doctors can view consultations assigned to them and update status
 *   - Admins can view all consultations
 *   - Nobody can access consultations that don't belong to them
 *
 * request.user is set by the authenticate middleware and comes from
 * the verified JWT — it is trusted server-side information.
 */

import mongoose from "mongoose";
import Consultation from "../models/Consultation.js";
import User from "../models/User.js";

// ────────────────────────────────────────
// POST /api/consultations — Patient requests a consultation
// ────────────────────────────────────────
export async function requestConsultation(request, response, next) {
  try {
    const { doctor, reason } = request.body;

    // The patient is the logged-in user (from JWT — trusted)
    const patientId = request.user.userId;

    if (!doctor) {
      return response.status(400).json({
        error: "Missing required data",
        message: "Doctor ID is required."
      });
    }

    if (!mongoose.isValidObjectId(doctor)) {
      return response.status(400).json({
        error: "Invalid doctor ID",
        message: "Doctor must be a valid MongoDB ID."
      });
    }

    if (patientId === doctor) {
      return response.status(400).json({
        error: "Invalid consultation",
        message: "You cannot create a consultation with yourself."
      });
    }

    // Verify the doctor exists and is actually a doctor
    const doctorUser = await User.findById(doctor);
    if (!doctorUser || doctorUser.role !== "doctor") {
      return response.status(404).json({
        error: "Doctor not found",
        message: "The specified doctor does not exist or is not a doctor."
      });
    }

    const consultation = await Consultation.create({
      patient: patientId,
      doctor,
      reason
    });

    const populated = await Consultation.findById(consultation._id)
      .populate("patient", "fullName email")
      .populate("doctor", "fullName email");

    return response.status(201).json({
      message: "Consultation requested.",
      data: populated
    });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────────────────────
// GET /api/consultations/my — User views their own consultations
// ────────────────────────────────────────
export async function getMyConsultations(request, response, next) {
  try {
    const userId = request.user.userId;
    const role = request.user.role;

    let filter = {};

    if (role === "patient" || role === "guest") {
      filter = { patient: userId };
    } else if (role === "doctor") {
      filter = { doctor: userId };
    }
    // admin sees all — no filter needed

    const consultations = await Consultation.find(filter)
      .populate("patient", "fullName email")
      .populate("doctor", "fullName email")
      .sort({ createdAt: -1 });

    return response.status(200).json({ data: consultations });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────────────────────
// GET /api/consultations — Admin views all consultations
// ────────────────────────────────────────
export async function listConsultations(request, response, next) {
  try {
    const consultations = await Consultation.find()
      .populate("patient", "fullName email")
      .populate("doctor", "fullName email")
      .sort({ createdAt: -1 });

    return response.status(200).json({ data: consultations });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────────────────────
// GET /api/consultations/:id — View single consultation (authorized)
// ────────────────────────────────────────
export async function getConsultation(request, response, next) {
  try {
    const consultationId = request.params.id;

    if (!mongoose.isValidObjectId(consultationId)) {
      return response.status(400).json({
        error: "Invalid consultation ID",
        message: "Provide a valid consultation ID."
      });
    }

    const consultation = await Consultation.findById(consultationId)
      .populate("patient", "fullName email")
      .populate("doctor", "fullName email");

    if (!consultation) {
      return response.status(404).json({
        error: "Not found",
        message: "Consultation not found."
      });
    }

    // Authorization check: only the patient, doctor, or admin can view
    const userId = request.user.userId;
    const role = request.user.role;
    const isParticipant =
      consultation.patient._id.toString() === userId ||
      consultation.doctor._id.toString() === userId;

    if (!isParticipant && role !== "admin") {
      return response.status(403).json({
        error: "Access denied",
        message: "You are not authorized to view this consultation."
      });
    }

    return response.status(200).json({ data: consultation });
  } catch (error) {
    return next(error);
  }
}

// ────────────────────────────────────────
// PATCH /api/consultations/:id/status — Update consultation status
// ────────────────────────────────────────
export async function updateConsultationStatus(request, response, next) {
  try {
    const consultationId = request.params.id;
    const { status } = request.body;

    if (!mongoose.isValidObjectId(consultationId)) {
      return response.status(400).json({
        error: "Invalid consultation ID",
        message: "Provide a valid consultation ID."
      });
    }

    const validTransitions = {
      requested: ["accepted", "cancelled"],
      accepted: ["active", "cancelled"],
      active: ["completed", "cancelled"],
      completed: [],
      cancelled: []
    };

    const consultation = await Consultation.findById(consultationId)
      .populate("patient", "fullName email")
      .populate("doctor", "fullName email");

    if (!consultation) {
      return response.status(404).json({
        error: "Not found",
        message: "Consultation not found."
      });
    }

    // Authorization: only the doctor or admin can update status
    const userId = request.user.userId;
    const role = request.user.role;
    const isDoctor = consultation.doctor._id.toString() === userId;
    const isPatient = consultation.patient._id.toString() === userId;

    if (!isDoctor && role !== "admin") {
      // Patients can only cancel
      if (isPatient && status === "cancelled") {
        // Allow patient to cancel
      } else {
        return response.status(403).json({
          error: "Access denied",
          message: "Only the assigned doctor or an admin can update consultation status."
        });
      }
    }

    // Validate status transition
    const allowed = validTransitions[consultation.status] || [];
    if (!allowed.includes(status)) {
      return response.status(400).json({
        error: "Invalid status transition",
        message: `Cannot change from "${consultation.status}" to "${status}". Allowed transitions: ${allowed.join(", ") || "none"}.`
      });
    }

    consultation.status = status;
    await consultation.save();

    return response.status(200).json({
      message: `Consultation ${status}.`,
      data: consultation
    });
  } catch (error) {
    return next(error);
  }
}
