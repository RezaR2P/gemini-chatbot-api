/**
 * Main application entry point
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes
import chatRoutes from './src/routes/chatRoutes.js';
import historyRoutes from './src/routes/historyRoutes.js';

// Import middlewares
import errorHandler from './src/middlewares/errorHandler.js';
import notFoundHandler from './src/middlewares/notFoundHandler.js';

// Initialize Express app
const app = express();

// Apply global middlewares
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Apply API routes
app.use('/api/chat', chatRoutes);
app.use('/api/chat-history', historyRoutes);

// Handle 404 errors
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is ready on http://localhost:${PORT}`);
});
