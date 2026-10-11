import { Router } from "express";
import { requestGuestAccess } from "../controllers/guestController.js";

const guestRouter = Router();

// Phase 11: Guest access — no authentication required (it creates one)
guestRouter.post("/access", requestGuestAccess);

export default guestRouter;
