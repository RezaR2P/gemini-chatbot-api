/**
 * Middleware for handling 404 Not Found responses
 */

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found - The requested resource does not exist' });
}

export default notFoundHandler;
