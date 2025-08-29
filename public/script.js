document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const appWrapper = document.querySelector('.app-wrapper');
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  const submitBtn = chatForm.querySelector('button[type="submit"]');
  const imageUpload = document.getElementById('image-upload');
  const audioUpload = document.getElementById('audio-upload');
  const clearAttachment = document.getElementById('clear-attachment');
  const attachmentPreview = document.getElementById('attachment-preview');
  const clearHistoryBtn = document.getElementById('clear-history');
  const newChatBtn = document.getElementById('new-chat');
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  const toggleSidebarMobileBtn = document.getElementById('toggle-sidebar-mobile');
  const historyList = document.getElementById('history-list');
  
  // State
  let currentAttachment = null;
  let currentSessionId = localStorage.getItem('chatSessionId') || generateSessionId();
  let chatMessages = [];
  let allSessions = [];
  let messageSeq = 0; // ensure unique message IDs to avoid DOM overwrites

  // Generate a unique ID with an optional prefix
  function uniqueId(prefix = 'msg') {
    messageSeq += 1;
    return `${prefix}-${Date.now()}-${messageSeq}`;
  }

  // Generate a random session ID
  function generateSessionId() {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('chatSessionId', sessionId);
    return sessionId;
  }

  // Sidebar toggle handlers
  function toggleSidebar() {
    if (window.innerWidth <= 1024) {
      appWrapper.classList.toggle('sidebar-active');
      
      // Create overlay if it doesn't exist
      if (appWrapper.classList.contains('sidebar-active')) {
        if (!document.querySelector('.sidebar-overlay')) {
          const overlay = document.createElement('div');
          overlay.className = 'sidebar-overlay';
          overlay.addEventListener('click', toggleSidebar);
          appWrapper.appendChild(overlay);
        }
      } else {
        // Remove overlay when sidebar is hidden
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
          overlay.removeEventListener('click', toggleSidebar);
          overlay.remove();
        }
      }
    } else {
      appWrapper.classList.toggle('sidebar-collapsed');
    }
  }
  
  toggleSidebarBtn.addEventListener('click', toggleSidebar);
  toggleSidebarMobileBtn.addEventListener('click', toggleSidebar);

  // Simple markdown formatter for bot messages (with basic XSS safety)
  function formatBotMarkdown(text) {
    if (!text) return '';
    const safe = String(text)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return safe
      // Handle multi-line code blocks first
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Bold, italic, inline code
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }
  
  // Load all chat sessions
  async function loadAllSessions() {
    try {
      const response = await fetch('/api/chat-history');
      if (response.ok) {
        const data = await response.json();
        allSessions = data.sessions || [];
        renderSessionList();
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  }
  
  // Render session list in sidebar
  function renderSessionList() {
    historyList.innerHTML = '';
    
    if (allSessions.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'No chat history yet';
      historyList.appendChild(emptyState);
      return;
    }
    
    allSessions.forEach(session => {
      const chatItem = document.createElement('div');
      chatItem.className = 'chat-item';
      if (session.id === currentSessionId) {
        chatItem.classList.add('active');
      }
      
      chatItem.innerHTML = `
        <div class="chat-item-title">${session.title}</div>
        <div class="chat-item-date">${formatDate(session.updatedAt)}</div>
      `;
      
      chatItem.addEventListener('click', () => selectSession(session.id));
      historyList.appendChild(chatItem);
    });
  }
  
  // Format date helper
  function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }
  
  // Select a session from history
  async function selectSession(sessionId) {
    if (sessionId === currentSessionId) return;
    
    currentSessionId = sessionId;
    localStorage.setItem('chatSessionId', sessionId);
    
    // Update UI to show active session
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const selectedItem = Array.from(document.querySelectorAll('.chat-item')).find(
      item => item.querySelector('.chat-item-title').textContent === 
            allSessions.find(s => s.id === sessionId)?.title
    );
    
    if (selectedItem) {
      selectedItem.classList.add('active');
    }
    
    // Load chat history for this session
    await loadChatHistory();
    
    // On mobile, close sidebar after selection
    if (window.innerWidth <= 1024) {
      toggleSidebar();
    }
  }

  // Clear current chat
  clearHistoryBtn.addEventListener('click', async function() {
    if (confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
      try {
        // Delete on server
        await fetch(`/api/chat-history/${currentSessionId}`, {
          method: 'DELETE'
        });
        
        // Clear local storage
        localStorage.removeItem(`chatHistory_${currentSessionId}`);
        
        // Clear UI
        chatBox.innerHTML = '';
        chatMessages = [];
        
        // Refresh session list
        loadAllSessions();
        
        // Add welcome message
        setTimeout(() => {
          addMessage('bot', 'Chat history cleared. How can I help you today?');
        }, 300);
      } catch (error) {
        console.error('Error clearing chat history:', error);
      }
    }
  });

  // Start a new chat
  newChatBtn.addEventListener('click', function() {
    // Generate new session ID
    currentSessionId = generateSessionId();
    localStorage.setItem('chatSessionId', currentSessionId);
    
    // Clear UI
    chatBox.innerHTML = '';
    chatMessages = [];
    
    // Refresh session list
    loadAllSessions();
    
    // Add welcome message
    setTimeout(() => {
      addMessage('bot', 'Hello! I\'m Gemini AI Chatbot. How can I help you today?');
    }, 300);
    
    // On mobile, close sidebar after new chat creation
    if (window.innerWidth <= 1024) {
      toggleSidebar();
    }
  });

  // Load chat history
  async function loadChatHistory() {
    try {
      // Clear previous messages
      chatBox.innerHTML = '';
      
      // Show loading indicator in a container for proper styling
      const loadingContainer = document.createElement('div');
      loadingContainer.className = 'message-container bot-container';
      loadingContainer.innerHTML = `<div class="message bot"><div class="loading-messages">Loading messages...</div></div>`;
      chatBox.appendChild(loadingContainer);
      
      // Load from server - ensure we're using the correct session ID
      const response = await fetch(`/api/chat-history/${currentSessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          // Remove immediate consecutive duplicates (often caused by double-save)
          const deduped = [];
          for (const m of data.messages) {
            const prev = deduped[deduped.length - 1];
            if (
              prev &&
              prev.role === m.role &&
              (prev.content || '') === (m.content || '') &&
              !!prev.hasImage === !!m.hasImage &&
              !!prev.hasAudio === !!m.hasAudio
            ) {
              continue; // skip duplicate
            }
            deduped.push(m);
          }
          chatMessages = deduped;
          
          // Update document title with chat title
          document.title = data.title ? `${data.title} - Gemini AI Chatbot` : 'Gemini AI Chatbot';
          
          // Display server messages
          chatBox.innerHTML = '';
          // Process messages in the original order they were created
          deduped.forEach(msg => {
            // Check for attachments
            const attachment = msg.hasImage || msg.hasAudio ? { 
              type: msg.hasImage ? 'image' : 'audio',
              isReference: true // Flag that we don't have actual file data
            } : null;
            
            // Make sure we correctly identify user vs bot messages and normalize role
            const messageRole = msg.role === 'user' ? 'user' : 'bot';
            
            // Use the normalized role and original content
            addMessage(messageRole, msg.content || '', null, attachment);
          });
          
          // If there are messages, scroll to the bottom
          if (chatMessages.length > 0) {
            scrollToBottom();
          }
        }
      } else if (response.status === 404) {
        // Session not found, might be a new one
        chatBox.innerHTML = '';
        chatMessages = [];
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      chatBox.innerHTML = '';
    }
    
    // If no messages, add welcome message
    if (chatBox.children.length === 0) {
      setTimeout(() => {
        // Explicitly set role as 'bot' for welcome message
        addMessage('bot', 'Halo! Saya adalah Gemini AI Chatbot. Ada yang bisa saya bantu hari ini?');
      }, 300);
    }
  }
  
  // Helper to scroll chat to bottom with improved reliability
  function scrollToBottom() {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      // First attempt immediate scroll to handle fast rendering
      chatBox.scrollTop = chatBox.scrollHeight;
      
      // Then use smooth scrolling with a slight delay to ensure DOM has updated
      setTimeout(() => {
        chatBox.scrollTo({
          top: chatBox.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    });
  }

  // Save message to history
  // Removed unused saveMessageToHistory; backend persists history.

  // Initial setup
  function initializeApp() {
    // Load chat history for current session
    loadChatHistory();
    
    // Load all sessions for the sidebar
    loadAllSessions();
  }
  
  // Start the app
  initializeApp();

  // Add welcome message - removed as we now load from history

  // Handle image upload
  imageUpload.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
      handleFileUpload(this.files[0], 'image');
    }
  });

  // Handle audio upload
  audioUpload.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
      handleFileUpload(this.files[0], 'audio');
    }
  });

  // Clear attachment
  clearAttachment.addEventListener('click', function() {
    clearCurrentAttachment();
  });

  // Handle file upload
  function handleFileUpload(file, type) {
    const fileReader = new FileReader();
    
    fileReader.onload = function(e) {
      // Clear previous attachment
      clearCurrentAttachment(false);
      
      // Set current attachment
      currentAttachment = {
        type: type,
        file: file,
        data: e.target.result
      };
      
      // Show preview
      attachmentPreview.innerHTML = '';
      attachmentPreview.classList.add('active');
      
      const fileLabel = document.createElement('span');
      fileLabel.className = 'attachment-label';
      fileLabel.textContent = type === 'image' ? 'Preview Gambar:' : 'Preview Audio:';
      attachmentPreview.appendChild(fileLabel);
      
      if (type === 'image') {
        const img = document.createElement('img');
        img.src = e.target.result;
        attachmentPreview.appendChild(img);
      } else if (type === 'audio') {
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = e.target.result;
        attachmentPreview.appendChild(audio);
      }
      
      // Show clear button
      clearAttachment.classList.remove('hidden');
    };
    
    fileReader.readAsDataURL(file);
  }

  // Clear current attachment
  function clearCurrentAttachment(resetInput = true) {
    currentAttachment = null;
    attachmentPreview.innerHTML = '';
    attachmentPreview.classList.remove('active');
    clearAttachment.classList.add('hidden');
    
    if (resetInput) {
      imageUpload.value = '';
      audioUpload.value = '';
    }
  }

  // Helper to add a message to the chat box with markdown and attachments
  function addMessage(role, content, messageId = null, attachment = null) {
  // Normalize the role to ensure it's always 'user' or 'bot'
  const normalizedRole = role === 'user' ? 'user' : 'bot';
    
    // Create message container for proper alignment
    const containerDiv = document.createElement('div');
    // Add both the container class and a specific role class for better browser compatibility
    containerDiv.className = `message-container ${normalizedRole}-container`;
    
    // Create the message bubble
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${normalizedRole}`;
    // Always assign a unique id if not provided to prevent accidental reuse
    if (!messageId) {
      messageSeq += 1;
      messageId = `${normalizedRole}-msg-${Date.now()}-${messageSeq}`;
    }
    msgDiv.id = messageId;
    
    // Enhanced markdown support only for bot messages
    // Create message content element
    const textElement = document.createElement('div');
    textElement.className = 'message-text';
    if (normalizedRole === 'bot') {
      textElement.innerHTML = formatBotMarkdown(content);
    } else {
      // For user messages, use textContent for maximum safety
      textElement.textContent = content;
    }
    
    msgDiv.appendChild(textElement);
    
    // Add attachment if provided
    if (attachment) {
      if (attachment.type === 'image') {
        if (attachment.isReference) {
          // This is a reference to an uploaded image
          const imgPlaceholder = document.createElement('div');
          imgPlaceholder.className = 'image-reference';
          imgPlaceholder.innerHTML = '<i class="fas fa-image"></i> [Image attachment]';
          msgDiv.appendChild(imgPlaceholder);
        } else {
          const img = document.createElement('img');
          img.src = attachment.data;
          img.className = 'attached-image';
          img.alt = 'Attached image';
          msgDiv.appendChild(img);
        }
      } else if (attachment.type === 'audio') {
        if (attachment.isReference) {
          // This is a reference to an uploaded audio
          const audioPlaceholder = document.createElement('div');
          audioPlaceholder.className = 'audio-reference';
          audioPlaceholder.innerHTML = '<i class="fas fa-microphone"></i> [Audio attachment]';
          msgDiv.appendChild(audioPlaceholder);
        } else {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = attachment.data;
          audio.className = 'attached-audio';
          msgDiv.appendChild(audio);
        }
      }
    }
    
    // Add message to container
    containerDiv.appendChild(msgDiv);
    
    // Add container to chat box
    chatBox.appendChild(containerDiv);
    
  // Use our improved scroll to bottom function
    scrollToBottom();

  return msgDiv;
  }

  // Helper to update a message's content by ID
  function updateMessage(messageId, newContent) {
    const msgDiv = document.getElementById(messageId);
    if (msgDiv) {
      const textElement = msgDiv.querySelector('.message-text') || msgDiv;
      textElement.innerHTML = newContent;
      
      // Make sure to scroll to the updated message
      msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  chatForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const message = userInput.value.trim();
    
    // Check if we have a message or attachment
    if (!message && !currentAttachment) return;
    
    // Basic input validation and sanitization
    const sanitizedMessage = message 
      ? message.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : '';
    
    // Get attachment to display in the UI (before it's cleared)
    const displayAttachment = currentAttachment ? {...currentAttachment} : null;
    
    // Add user message with sanitized content
    addMessage('user', sanitizedMessage || (displayAttachment ? displayAttachment.file.name : ''), null, displayAttachment);
    
  // History will be persisted by backend; avoid double-save here
    
    // Clear input and disable button to prevent multiple submissions
    userInput.value = '';
    
    // Show typing indicator
  const thinkingId = uniqueId('thinking');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'typing-indicator';
    thinkingDiv.appendChild(document.createElement('span'));
    thinkingDiv.appendChild(document.createElement('span'));
    thinkingDiv.appendChild(document.createElement('span'));
    const thinkingMsg = addMessage('bot', '', thinkingId);
    thinkingMsg.appendChild(thinkingDiv);
    thinkingMsg.classList.add('typing');
    
    // prevent double submit while waiting
    if (submitBtn) submitBtn.disabled = true;

    // Prepare for sending
    let url = '/api/chat/chat';
    let payload;
    let requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    // Handle different types of content
    if (currentAttachment) {
      if (currentAttachment.type === 'image') {
        url = '/api/chat/generate-from-image';
        const formData = new FormData();
        formData.append('image', currentAttachment.file);
        formData.append('prompt', message || 'Describe this image in detail');
        formData.append('sessionId', currentSessionId);
        
        requestOptions = {
          method: 'POST',
          body: formData
        };
      } else if (currentAttachment.type === 'audio') {
        url = '/api/chat/generate-from-audio';
        const formData = new FormData();
        formData.append('audio', currentAttachment.file);
        formData.append('prompt', message || 'Transcribe this audio');
        formData.append('sessionId', currentSessionId);
        
        requestOptions = {
          method: 'POST',
          body: formData
        };
      }
      
      // Clear attachment now that we've processed it
      clearCurrentAttachment();
    } else {
      // Regular text message
      payload = {
        messages: [{ role: 'user', content: message }],
        sessionId: currentSessionId
      };
      requestOptions.body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const thinkingElement = document.getElementById(thinkingId);
        if (thinkingElement) {
          const errorMsg = response.status === 429 
            ? 'Terlalu banyak permintaan. Mohon tunggu beberapa saat dan coba lagi.' 
            : 'Maaf, terjadi kesalahan saat menghubungi server.';
          
          // Clear the element and add error message
          thinkingElement.innerHTML = '';
          const textElement = document.createElement('div');
          textElement.className = 'message-text';
          textElement.textContent = errorMsg;
          thinkingElement.appendChild(textElement);
          thinkingElement.classList.remove('typing');
        }
        console.error(`Server error: ${response.status} ${response.statusText}`);
        return;
      }

  const data = await response.json();
      
      // Remove typing indicator and replace with response
      const thinkingElement = document.getElementById(thinkingId);
      if (thinkingElement) {
        if (data && (typeof data.result === 'string' || typeof data.text === 'string')) {
          const result = data.result || data.text || '';
          
          // Format and sanitize bot response consistently
          const formattedResult = formatBotMarkdown(result);
          
          // Clear the element and add formatted message
          thinkingElement.innerHTML = '';
          const textElement = document.createElement('div');
          textElement.className = 'message-text';
          textElement.innerHTML = formattedResult;
          thinkingElement.appendChild(textElement);
          thinkingElement.classList.remove('typing');
          
          // Backend already saved bot response; avoid double-save
          if (data.sessionTitle) {
            // Update session list/title if needed
            loadAllSessions();
          }
        } else {
          thinkingElement.innerHTML = '<div class="message-text">Maaf, tidak ada respons yang diterima.</div>';
          thinkingElement.classList.remove('typing');
        }
      }
    } catch (err) {
      console.error('Error communicating with server:', err);
      const thinkingElement = document.getElementById(thinkingId);
      if (thinkingElement) {
        thinkingElement.innerHTML = '<div class="message-text">Maaf, terjadi kesalahan dalam komunikasi dengan server.</div>';
        thinkingElement.classList.remove('typing');
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      userInput.focus();
    }
  });
});
