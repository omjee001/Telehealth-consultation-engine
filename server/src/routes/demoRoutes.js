import { Router } from "express";

const demoRouter = Router();

// Temporary demo data for learning routes and JSON responses.
// It is not stored in a database and must not be treated as real healthcare data.
const demoDoctors = [
  { id: "demo-doctor-1", name: "Dr. Asha Patel", specialty: "General Medicine" },
  { id: "demo-doctor-2", name: "Dr. Ravi Kumar", specialty: "Dermatology" }
];

// GET /api/demo/doctors
demoRouter.get("/doctors", (request, response) => {
  response.status(200).json({
    isDemo: true,
    message: "Temporary endpoint: this data is hard-coded and not persistent.",
    data: demoDoctors
  });
});

// GET /api/demo/consultation-summary?patientName=Sam
// `patientName` demonstrates reading a value from the request query string.
demoRouter.get("/consultation-summary", (request, response) => {
  const patientName = request.query.patientName || "Guest";

  response.status(200).json({
    isDemo: true,
    message: "Temporary endpoint: no consultation has been created or stored.",
    data: {
      patientName,
      consultationStatus: "example only",
      assignedDoctor: demoDoctors[0].name
    }
  });
});

export default demoRouter;

