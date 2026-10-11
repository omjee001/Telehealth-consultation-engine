// Express recognizes this as error middleware because it has four parameters.
function errorHandler(error, request, response, next) {
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({
      error: "Invalid JSON",
      message: "Check that the request body contains valid JSON."
    });
  }

  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((item) => item.message);
    return response.status(400).json({ error: "Validation failed", messages });
  }

  if (error.code === 11000) {
    return response.status(409).json({
      error: "Duplicate value",
      message: "A user with this email address already exists."
    });
  }

  if (error.name === "CastError") {
    return response.status(400).json({ error: "Invalid data", message: error.message });
  }

  console.error(error);

  return response.status(500).json({
    error: "Internal server error",
    message: "Something unexpected happened on the API server."
  });
}

export default errorHandler;
