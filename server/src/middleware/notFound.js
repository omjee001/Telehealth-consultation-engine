// Runs only when no earlier route matched the request URL.
function notFound(request, response) {
  response.status(404).json({
    error: "Not found",
    message: `No route exists for ${request.method} ${request.originalUrl}`
  });
}

export default notFound;

