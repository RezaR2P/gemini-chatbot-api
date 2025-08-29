/**
 * Global error handling middleware
 */

/**
 * Handles errors in the application and sends appropriate responses
 */
function errorHandler(err, req, res, next) {
  console.error('Global error:', err);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Determine appropriate status code
  const statusCode = err.statusCode || 500;
  
  // Send error response
  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

export default errorHandler;
