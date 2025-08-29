/**
 * Routes for chat functionality
 */

import express from 'express';
import multer from 'multer';
import { processChat, processImageChat, processDocument, processAudio, generateText } from '../controllers/chatController.js';

const router = express.Router();
const upload = multer(); // In-memory storage

// Text chat endpoint
router.post('/chat', processChat);

// Image processing endpoint
router.post('/generate-from-image', upload.single('image'), processImageChat);
// Alias with underscore
router.post('/generate_from_image', upload.single('image'), processImageChat);

// Document processing endpoint
router.post('/generate-from-document', upload.single('document'), processDocument);
// Alias with underscore
router.post('/generate_from_document', upload.single('document'), processDocument);

// Audio processing endpoint
router.post('/generate-from-audio', upload.single('audio'), processAudio);
// Alias with underscore
router.post('/generate_from_audio', upload.single('audio'), processAudio);

// Simple text generation endpoint
router.post('/generate-text', generateText);
// Backwards-compatible alias (some clients may use underscore)
router.post('/generate_text', generateText);
// GET aliases to support quick testing via browser/Postman with query param ?prompt=
router.get('/generate-text', generateText);
router.get('/generate_text', generateText);


export default router;
