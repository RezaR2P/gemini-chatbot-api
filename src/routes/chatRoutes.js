/**
 * Routes for chat functionality
 */

import express from 'express';
import multer from 'multer';
import { processChat, processImageChat, processImagesChat, processDocument, processAudio, generateText } from '../controllers/chatController.js';

const router = express.Router();
// In-memory storage with sane file size limits (10MB)
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// Text chat endpoint
router.post('/chat', processChat);

// Image processing endpoint
router.post('/generate-from-image', upload.single('image'), processImageChat);
// Alias with underscore
router.post('/generate_from_image', upload.single('image'), processImageChat);

// Multiple images processing endpoint
router.post('/generate-from-images', upload.array('images', 6), processImagesChat);
router.post('/generate_from_images', upload.array('images', 6), processImagesChat);

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
