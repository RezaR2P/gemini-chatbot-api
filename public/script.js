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
  // Attachments state: images: array of {file, data}, audio: single {file, data} or null
  let attachments = { images: [], audio: null };
  let currentSessionId = localStorage.getItem('chatSessionId') || generateSessionId();
  let chatMessages = [];
  let allSessions = [];
  let messageSeq = 0; // ensure unique message IDs to avoid DOM overwrites
  // Toast notifications
  let toastTimer;
  function ensureToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }
  function showToast(message, type = 'error', duration = 3000) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    // animate in
    requestAnimationFrame(() => toast.classList.add('show'));
    // auto dismiss (single timer keeps last toast visible long enough)
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  // Debounce helper
  function debounce(fn, wait = 400) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }

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
      } else {
        showToast('Gagal memuat daftar chat. Coba lagi nanti.', 'error');
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      showToast('Gagal memuat daftar chat. Periksa koneksi Anda.', 'error');
    }
  }

  // Debounced version to avoid frequent refreshes
  const debouncedLoadAllSessions = debounce(loadAllSessions, 450);
  
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
        
  // Refresh session list (debounced)
  debouncedLoadAllSessions();
        
        // Add welcome message
        setTimeout(() => {
          addMessage('bot', 'Chat history cleared. How can I help you today?');
        }, 300);
      } catch (error) {
        console.error('Error clearing chat history:', error);
  showToast('Gagal menghapus riwayat chat.', 'error');
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
    
  // Refresh session list (debounced)
  debouncedLoadAllSessions();
    
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
      } else {
        showToast('Gagal memuat riwayat chat.', 'error');
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      chatBox.innerHTML = '';
      showToast('Gagal memuat riwayat chat. Periksa koneksi Anda.', 'error');
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
    if (this.files && this.files.length) {
      const files = Array.from(this.files).slice(0, 6); // cap to 6 images
      files.forEach(file => addAttachment(file, 'image'));
      this.value = '';
    }
  });

  // Handle audio upload
  audioUpload.addEventListener('change', function(e) {
    if (this.files && this.files[0]) {
      addAttachment(this.files[0], 'audio');
      this.value = '';
    }
  });

  // Clear attachment
  clearAttachment.addEventListener('click', function() {
    clearAllAttachments();
  });

  // Add attachment to state and render preview chips
  function addAttachment(file, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'image') {
        attachments.images.push({ file, data: e.target.result, type: 'image' });
      } else if (type === 'audio') {
        // only one audio at a time; replace existing
        attachments.audio = { file, data: e.target.result, type: 'audio' };
      }
      renderAttachmentPreview();
    };
    reader.readAsDataURL(file);
  }

  // Render preview chips for attachments
  function renderAttachmentPreview() {
    attachmentPreview.innerHTML = '';
    const hasAny = attachments.images.length > 0 || !!attachments.audio;
    if (!hasAny) {
      attachmentPreview.classList.remove('active');
      clearAttachment.classList.add('hidden');
      return;
    }
    attachmentPreview.classList.add('active');
    clearAttachment.classList.remove('hidden');
    
    const label = document.createElement('span');
    label.className = 'attachment-label';
    label.textContent = 'Attachments:';
    attachmentPreview.appendChild(label);
    
    const list = document.createElement('div');
    list.className = 'attachment-list';
    attachmentPreview.appendChild(list);
    
    attachments.images.forEach((att, idx) => {
      const item = document.createElement('div');
      item.className = 'attachment-item';
      const img = document.createElement('img');
      img.src = att.data;
      item.appendChild(img);
      
  const actions = document.createElement('div');
  actions.className = 'attachment-actions';
  const editBtn = document.createElement('button');
  editBtn.className = 'attachment-action-btn edit';
      editBtn.title = 'Ganti gambar';
      editBtn.innerHTML = '<i class="fas fa-pen"></i>';
      editBtn.addEventListener('click', () => replaceImageAt(idx));
  const delBtn = document.createElement('button');
  delBtn.className = 'attachment-action-btn delete';
      delBtn.title = 'Hapus gambar';
      delBtn.innerHTML = '<i class="fas fa-times"></i>';
      delBtn.addEventListener('click', () => removeImageAt(idx));
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      item.appendChild(actions);
      list.appendChild(item);
    });
    
    if (attachments.audio) {
      const aItem = document.createElement('div');
      aItem.className = 'attachment-item audio';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = attachments.audio.data;
      aItem.appendChild(audio);
      const actions = document.createElement('div');
      actions.className = 'attachment-actions';
      const delBtn = document.createElement('button');
      delBtn.className = 'attachment-action-btn';
      delBtn.title = 'Hapus audio';
      delBtn.innerHTML = '<i class="fas fa-times"></i>';
      delBtn.addEventListener('click', () => { attachments.audio = null; renderAttachmentPreview(); });
      actions.appendChild(delBtn);
      aItem.appendChild(actions);
      list.appendChild(aItem);
    }
  }

  function replaceImageAt(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          attachments.images[index] = { file, data: e.target.result, type: 'image' };
          renderAttachmentPreview();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  function removeImageAt(index) {
    attachments.images.splice(index, 1);
    renderAttachmentPreview();
  }

  function clearAllAttachments() {
    attachments = { images: [], audio: null };
    imageUpload.value = '';
    audioUpload.value = '';
    renderAttachmentPreview();
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
    
    // Add attachment(s) if provided
    function appendOne(att) {
      if (att.type === 'image') {
        if (att.isReference) {
          const ref = document.createElement('div');
          ref.className = 'image-reference';
          ref.innerHTML = '<i class="fas fa-image"></i> [Image attachment]';
          msgDiv.appendChild(ref);
        } else {
          const img = document.createElement('img');
          img.src = att.data;
          img.className = 'attached-image';
          img.alt = 'Attached image';
          msgDiv.appendChild(img);
        }
      } else if (att.type === 'audio') {
        if (att.isReference) {
          const ref = document.createElement('div');
          ref.className = 'audio-reference';
          ref.innerHTML = '<i class="fas fa-microphone"></i> [Audio attachment]';
          msgDiv.appendChild(ref);
        } else {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = att.data;
          audio.className = 'attached-audio';
          msgDiv.appendChild(audio);
        }
      }
    }
    if (attachment) {
      if (Array.isArray(attachment)) {
        attachment.forEach(appendOne);
      } else {
        appendOne(attachment);
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

  // Build request each time from a snapshot (so it can be retried)
  function buildRequestFromSnapshot(snapshot) {
    let url = '/api/chat/chat';
    let requestOptions = { method: 'POST' };

    if (snapshot.kind === 'text') {
      url = '/api/chat/chat';
      requestOptions.headers = { 'Content-Type': 'application/json' };
      requestOptions.body = JSON.stringify({
        messages: [{ role: 'user', content: snapshot.prompt }],
        sessionId: snapshot.sessionId
      });
    } else if (snapshot.kind === 'audio') {
      url = '/api/chat/generate-from-audio';
      const formData = new FormData();
      formData.append('audio', snapshot.audioFile);
      formData.append('prompt', snapshot.prompt || 'Transcribe this audio');
      formData.append('sessionId', snapshot.sessionId);
      requestOptions.body = formData;
    } else if (snapshot.kind === 'images') {
      url = '/api/chat/generate-from-images';
      const formData = new FormData();
      snapshot.imageFiles.forEach(f => formData.append('images', f));
      formData.append('prompt', snapshot.prompt || 'Describe these images');
      formData.append('sessionId', snapshot.sessionId);
      requestOptions.body = formData;
    } else if (snapshot.kind === 'image') {
      url = '/api/chat/generate-from-image';
      const formData = new FormData();
      formData.append('image', snapshot.imageFiles[0]);
      formData.append('prompt', snapshot.prompt || 'Describe this image in detail');
      formData.append('sessionId', snapshot.sessionId);
      requestOptions.body = formData;
    }
    return { url, requestOptions };
  }

  // Show retry UI on a message bubble
  function showRetryUI(targetEl, snapshot, messageText = 'Maaf, terjadi kesalahan saat menghubungi server.') {
    targetEl.classList.remove('typing');
    targetEl.innerHTML = '';
    const textElement = document.createElement('div');
    textElement.className = 'message-text';
    textElement.textContent = messageText;
    targetEl.appendChild(textElement);

    const actions = document.createElement('div');
    actions.className = 'retry-wrap';
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'retry-btn';
    retryBtn.innerHTML = '<i class="fas fa-redo"></i> Kirim ulang';
    retryBtn.addEventListener('click', async () => {
      // show typing again
      targetEl.innerHTML = '';
      const typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.appendChild(document.createElement('span'));
      typing.appendChild(document.createElement('span'));
      typing.appendChild(document.createElement('span'));
      targetEl.appendChild(typing);
      targetEl.classList.add('typing');

      if (submitBtn) submitBtn.disabled = true;
      await performSend(snapshot, targetEl);
      if (submitBtn) submitBtn.disabled = false;
    });
    actions.appendChild(retryBtn);
    targetEl.appendChild(actions);
  }

  // Perform the send using a snapshot and update the same bot bubble
  async function performSend(snapshot, thinkingElement) {
    try {
      const { url, requestOptions } = buildRequestFromSnapshot(snapshot);
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const msg = response.status === 429
          ? 'Terlalu banyak permintaan. Mohon tunggu sebentar lalu kirim ulang.'
          : 'Maaf, terjadi kesalahan saat menghubungi server.';
        showRetryUI(thinkingElement, snapshot, msg);
        console.error(`Server error: ${response.status} ${response.statusText}`);
        showToast(`Permintaan gagal (${response.status}).`, 'error');
        return;
      }

      const data = await response.json();
      if (data && (typeof data.result === 'string' || typeof data.text === 'string')) {
        const result = data.result || data.text || '';
        thinkingElement.innerHTML = '';
        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.innerHTML = formatBotMarkdown(result);
        thinkingElement.appendChild(textElement);
        thinkingElement.classList.remove('typing');
        if (data.sessionTitle) loadAllSessions();
      } else {
        showRetryUI(thinkingElement, snapshot, 'Maaf, tidak ada respons yang diterima.');
      }
    } catch (err) {
      console.error('Network error:', err);
      showRetryUI(thinkingElement, snapshot, 'Gagal menghubungi server. Periksa koneksi lalu kirim ulang.');
      showToast('Gagal menghubungi server.', 'error');
    }
  }

  chatForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const message = userInput.value.trim();
    
    // Check if we have a message or attachment
    const hasAnyAttachment = attachments.images.length > 0 || !!attachments.audio;
    if (!message && !hasAnyAttachment) return;
    
    // Basic input validation and sanitization
    const sanitizedMessage = message 
      ? message.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : '';
    
    // Build display attachments array for UI rendering
    const displayAttachments = [];
    attachments.images.forEach(img => displayAttachments.push({ type: 'image', data: img.data }));
    if (attachments.audio) displayAttachments.push({ type: 'audio', data: attachments.audio.data });

    // Add user message with attachments preview
    addMessage('user', sanitizedMessage || (displayAttachments.length ? 'Mengirim lampiran' : ''), null, displayAttachments);

    // Create bot thinking bubble
    const thinkingId = uniqueId('thinking');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'typing-indicator';
    thinkingDiv.appendChild(document.createElement('span'));
    thinkingDiv.appendChild(document.createElement('span'));
    thinkingDiv.appendChild(document.createElement('span'));
    const thinkingMsg = addMessage('bot', '', thinkingId);
    thinkingMsg.appendChild(thinkingDiv);
    thinkingMsg.classList.add('typing');

    // Build a retryable snapshot BEFORE clearing attachments
    let snapshot;
    if (hasAnyAttachment) {
      if (attachments.audio) {
        snapshot = {
          kind: 'audio',
          prompt: message || 'Transcribe this audio',
          sessionId: currentSessionId,
          audioFile: attachments.audio.file
        };
      } else if (attachments.images.length > 1) {
        snapshot = {
          kind: 'images',
          prompt: message || 'Describe these images',
          sessionId: currentSessionId,
          imageFiles: attachments.images.map(i => i.file)
        };
      } else {
        snapshot = {
          kind: 'image',
          prompt: message || 'Describe this image in detail',
          sessionId: currentSessionId,
          imageFiles: [attachments.images[0].file]
        };
      }
      // clear current UI attachments after snapshot
      clearAllAttachments();
    } else {
      snapshot = { kind: 'text', prompt: message, sessionId: currentSessionId };
    }

    // Clear input and prevent double submit while waiting
    userInput.value = '';
    if (submitBtn) submitBtn.disabled = true;

    await performSend(snapshot, document.getElementById(thinkingId));

    if (submitBtn) submitBtn.disabled = false;
    userInput.focus();
  });
});
