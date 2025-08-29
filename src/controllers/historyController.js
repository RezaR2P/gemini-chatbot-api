/**
 * Controllers for chat history management
 */

import chatHistoryService from '../services/chatHistoryService.js';

/**
 * Get all chat sessions
 */
function getAllSessions(req, res) {
  try {
    const sessions = chatHistoryService.getAllSessions();
    // Sort by most recent update
    sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json({ sessions });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
}

/**
 * Get a specific chat session
 */
function getSession(req, res) {
  try {
    const { sessionId } = req.params;
    const session = chatHistoryService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    // Create a deduplicated view (do not mutate stored history)
    const deduped = [];
    for (const m of session.messages) {
      const prev = deduped[deduped.length - 1];
      if (
        prev &&
        prev.role === m.role &&
        (prev.content || '') === (m.content || '') &&
        !!prev.hasImage === !!m.hasImage &&
        !!prev.hasAudio === !!m.hasAudio
      ) {
        continue;
      }
      deduped.push(m);
    }
    res.json({
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messages: deduped
    });
  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({ error: 'Failed to retrieve session history' });
  }
}

/**
 * Add a message to a chat session
 */
function addMessage(req, res) {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    if (!message || !message.role || !message.content) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    
    // Add message to session
    const session = chatHistoryService.addMessage(sessionId, message);
    
    res.json({ 
      success: true,
      session: {
        id: sessionId,
        title: session.title,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    console.error('Error saving message to history:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
}

/**
 * Update a chat session title
 */
function updateSessionTitle(req, res) {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Valid title is required' });
    }
    
    const success = chatHistoryService.updateSessionTitle(sessionId, title);
    
    if (!success) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating session title:', error);
    res.status(500).json({ error: 'Failed to update session title' });
  }
}

/**
 * Delete a chat session
 */
function deleteSession(req, res) {
  try {
    const { sessionId } = req.params;
    const success = chatHistoryService.deleteSession(sessionId);
    
    res.json({ success });
  } catch (error) {
    console.error('Error deleting chat history:', error);
    res.status(500).json({ error: 'Failed to delete chat history' });
  }
}

export {
  getAllSessions,
  getSession,
  addMessage,
  updateSessionTitle,
  deleteSession
};
