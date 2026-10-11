/*
 * Phase 7 — Consultation Routes (with authentication + authorization)
 *
 * Every consultation endpoint now requires a valid JWT (authenticate middleware).
 * Some endpoints additionally check the user's role (authorize middleware).
 */

import { Router } from "express";
import authenticate from "../middleware/authenticate.js";
import authorize from "../middleware/authorize.js";
import {
  requestConsultation,
  getMyConsultations,
  listConsultations,
  getConsultation,
  updateConsultationStatus
} from "../controllers/consultationController.js";

const consultationRouter = Router();

// All consultation routes require authentication
consultationRouter.use(authenticate);

// Patient requests a new consultation
consultationRouter.post("/", authorize("patient", "guest"), requestConsultation);

// User views their own consultations (filtered by role in the controller)
consultationRouter.get("/my", getMyConsultations);

// Admin views all consultations
consultationRouter.get("/", authorize("admin"), listConsultations);

// View a single consultation (authorization checked in the controller)
consultationRouter.get("/:id", getConsultation);

// Update consultation status (doctor accepts/completes, patient cancels)
consultationRouter.patch("/:id/status", updateConsultationStatus);

export default consultationRouter;
