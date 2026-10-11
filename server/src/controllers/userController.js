import User from "../models/User.js";

export async function listUsers(request, response, next) {
  try {
    // Phase 7: Support optional role filter (e.g. /api/users?role=doctor)
    const filter = {};
    if (request.query.role) {
      filter.role = request.query.role;
    }

    // passwordHash is hidden by the schema and never sent in this response.
    const users = await User.find(filter).sort({ createdAt: -1 });
    return response.status(200).json({ data: users });
  } catch (error) {
    return next(error);
  }
}
