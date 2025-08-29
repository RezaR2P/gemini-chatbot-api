/**
 * Controllers for chat-related endpoints
 */

import { GoogleGenAI } from '@google/genai';
import chatHistoryService from '../services/chatHistoryService.js';
import { extractText } from '../utils/geminiHelper.js';

// Initialize Google Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Process text chat messages
 */
async function processChat(req, res) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server misconfiguration: missing GEMINI_API_KEY' });
    }
    
    const { messages, sessionId } = req.body || {};
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: messages array is required' });
    }
    
    // Use the last user message as prompt
    const lastUser = [...messages].reverse().find(m => m && m.role === 'user' && typeof m.content === 'string');
    
    if (!lastUser || !lastUser.content.trim()) {
      return res.status(400).json({ error: 'Invalid payload: missing user message' });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: lastUser.content }]
    });

    const result = extractText(response)?.trim();
    
    // Save to chat history if sessionId is provided
    if (sessionId) {
      // Save user message
      chatHistoryService.addMessage(sessionId, {
        role: 'user',
        content: lastUser.content
      });
      
      // Save bot response
      const session = chatHistoryService.addMessage(sessionId, {
        role: 'bot',
        content: result
      });
      
      // Return updated session info
      return res.json({ 
        result: result || '', 
        sessionId,
        sessionTitle: session.title
      });
    }
    
    return res.json({ result: result || '', sessionId });
    
  } catch (error) {
    console.error('Error in processChat:', error);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
}

/**
 * Process image-based chat input
 */
async function processImageChat(req, res) {
  try {
    const { prompt, sessionId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    if (!req.file.mimetype?.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid file type. Please upload an image.' });
    }
    
    const imageBase64 = req.file.buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt || 'Describe this image in detail' },
            { inlineData: { mimeType: req.file.mimetype, data: imageBase64 } }
          ]
        }
      ]
    });
    
    const result = extractText(response);
    
    // Save to chat history if sessionId is provided
    if (sessionId) {
      // Save user message (with image reference)
      chatHistoryService.addMessage(sessionId, {
        role: 'user',
        content: prompt || 'Image uploaded',
        hasImage: true
      });
      
      // Save bot response
      const session = chatHistoryService.addMessage(sessionId, {
        role: 'bot',
        content: result
      });
      
      // Return updated session info
      return res.json({ 
        result, 
        sessionId,
        sessionTitle: session.title
      });
    }
    
    res.json({ result, sessionId });
    
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Process document input for analysis
 */
async function processDocument(req, res) {
  try {
    const { prompt } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Document file is required' });
    }
    
    const docBase64 = req.file.buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt || 'Summarize this document' },
            { inlineData: { mimeType: req.file.mimetype, data: docBase64 } }
          ]
        }
      ]
    });
    
    res.json({ result: extractText(response) });
    
  } catch (error) {
    console.error("Error processing document:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Process audio input for transcription/analysis
 */
async function processAudio(req, res) {
  try {
    const { prompt, sessionId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }
    if (!req.file.mimetype?.startsWith('audio/')) {
      return res.status(400).json({ error: 'Invalid file type. Please upload an audio file.' });
    }
    
    const audioBase64 = req.file.buffer.toString('base64');
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt || 'Transcribe this audio' },
            { inlineData: { mimeType: req.file.mimetype, data: audioBase64 } }
          ]
        }
      ]
    });
    
    const result = extractText(response);
    
    // Save to chat history if sessionId is provided
    if (sessionId) {
      // Save user message (with audio reference)
      chatHistoryService.addMessage(sessionId, {
        role: 'user',
        content: prompt || 'Audio uploaded',
        hasAudio: true
      });
      
      // Save bot response
      const session = chatHistoryService.addMessage(sessionId, {
        role: 'bot',
        content: result
      });
      
      // Return updated session info
      return res.json({ 
        result, 
        sessionId,
        sessionTitle: session.title
      });
    }
    
    res.json({ result, sessionId });
    
  } catch (error) {
    console.error("Error processing audio:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Simple text generation endpoint
 */
async function generateText(req, res) {
  try {
    // Support both POST (body) and GET (query) prompts
    const prompt = (req.method === 'GET')
      ? (typeof req.query.prompt === 'string' ? req.query.prompt : '')
      : (req.body?.prompt ?? '');

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ]
    });

    const text = extractText(response)?.trim();
    res.json({ text: text || '' });
    
  } catch (error) {
    console.error("Error generating text:", error);
    res.status(500).json({ error: error.message });
  }
}

export {
  processChat,
  processImageChat,
  processDocument,
  processAudio,
  generateText
};
