/**
 * Routes for chat history management
 */

import express from 'express';
import {
  getAllSessions,
  getSession,
  addMessage,
  updateSessionTitle,
  deleteSession
} from '../controllers/historyController.js';

const router = express.Router();

// Get all chat sessions
router.get('/', getAllSessions);

// Get specific session
router.get('/:sessionId', getSession);

// Add message to session
router.post('/:sessionId', addMessage);

// Update session title
router.put('/:sessionId', updateSessionTitle);

// Delete session
router.delete('/:sessionId', deleteSession);

export default router;
