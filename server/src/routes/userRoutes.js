import { Router } from "express";
import { listUsers } from "../controllers/userController.js";
import authenticate from "../middleware/authenticate.js";

const userRouter = Router();

// Phase 7: Requires authentication to list users.
// Supports ?role=doctor query filter for finding doctors.
userRouter.get("/", authenticate, listUsers);

export default userRouter;
