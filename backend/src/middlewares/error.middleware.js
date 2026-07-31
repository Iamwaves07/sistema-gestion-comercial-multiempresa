export function notFoundHandler(req, res, next) {
  const error = new Error(
    `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  );

  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error("Error no controlado en la API:", error);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Ocurrió un error interno en el servidor"
        : error.message,
  });
}