/**
 * Service for managing chat history
 */

// In-memory chat history storage with metadata
const chatHistory = new Map();

/**
 * Creates or retrieves a chat session
 * 
 * @param {string} sessionId - Unique identifier for the session
 * @param {string} title - Optional title for the session
 * @returns {Object} - The chat session object
 */
function addSession(sessionId, title) {
  if (!chatHistory.has(sessionId)) {
    chatHistory.set(sessionId, {
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return chatHistory.get(sessionId);
}

/**
 * Adds a message to a chat session
 * 
 * @param {string} sessionId - Unique identifier for the session 
 * @param {Object} message - Message object to add
 * @returns {Object} - The updated session
 */
function addMessage(sessionId, message) {
  const session = getSession(sessionId) || addSession(sessionId);
  session.messages.push({
    ...message,
    timestamp: new Date().toISOString()
  });
  session.updatedAt = new Date().toISOString();
  
  // Update session title based on first user message if no title exists
  if (session.title === 'New Chat' && message.role === 'user' && message.content?.trim()) {
    const title = message.content.trim();
    session.title = title.length > 30 ? `${title.substring(0, 30)}...` : title;
  }
  
  return session;
}

/**
 * Gets a chat session by ID
 * 
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Object|undefined} - The chat session or undefined if not found
 */
function getSession(sessionId) {
  return chatHistory.get(sessionId);
}

/**
 * Gets all chat sessions with metadata
 * 
 * @returns {Array} - Array of session objects with metadata
 */
function getAllSessions() {
  return Array.from(chatHistory.entries()).map(([id, data]) => ({
    id,
    title: data.title,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    messageCount: data.messages.length
  }));
}

/**
 * Deletes a chat session
 * 
 * @param {string} sessionId - Unique identifier for the session
 * @returns {boolean} - Success status
 */
function deleteSession(sessionId) {
  return chatHistory.delete(sessionId);
}

/**
 * Updates a chat session title
 * 
 * @param {string} sessionId - Unique identifier for the session
 * @param {string} title - New title for the session
 * @returns {boolean} - Success status
 */
function updateSessionTitle(sessionId, title) {
  const session = getSession(sessionId);
  if (session && title) {
    session.title = title;
    session.updatedAt = new Date().toISOString();
    return true;
  }
  return false;
}

export default {
  addSession,
  addMessage,
  getSession,
  getAllSessions,
  deleteSession,
  updateSessionTitle
};
