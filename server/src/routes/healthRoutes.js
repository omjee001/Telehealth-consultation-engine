import { Router } from "express";

const healthRouter = Router();

// GET /api/health
// This is useful for checking whether the API process is alive.
healthRouter.get("/", (request, response) => {
  response.status(200).json({
    status: "ok",
    service: "telehealth-api",
    message: "The API is running."
  });
});

export default healthRouter;

