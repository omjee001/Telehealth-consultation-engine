import { Router } from "express";
import { register, login } from "../controllers/authController.js";

const authRouter = Router();

// Phase 3: user registration
authRouter.post("/register", register);

// Phase 4: user login — returns a JWT on success
authRouter.post("/login", login);

export default authRouter;

