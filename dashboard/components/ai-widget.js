// AI Widget Chatbot Logic

class AIAssistant {
  constructor() {
    // Check if user is authenticated - hide on login pages
    if (!this.isUserAuthenticated()) {
      console.log('[AI Widget] User not authenticated - hiding widget');
      this.hideWidget();
      return;
    }

    this.panel = document.getElementById('aiChatPanel');
    this.button = document.getElementById('aiWidgetButton');
    this.closeButton = document.getElementById('aiCloseButton');
    this.messagesContainer = document.getElementById('aiMessagesContainer');
    this.inputField = document.getElementById('aiInputField');
    this.sendButton = document.getElementById('aiSendButton');

    // Validate all elements exist before initializing
    if (!this.panel || !this.button || !this.closeButton) {
      console.error('[AI Widget] Required elements not found in DOM');
      return;
    }

    this.chatHistory = []; // Session-only chat history
    this.lastSuggestion = null;
    this.isWaitingForResponse = false;

    this.init();
    console.log('[AI Widget] Initialized successfully');
  }

  /**
   * Check if user is authenticated
   * Returns false on auth/login pages
   */
  isUserAuthenticated() {
    // Hide on auth/login pages
    const currentPath = window.location.pathname;
    if (currentPath.includes('/auth') || currentPath.includes('/login')) {
      return false;
    }
    
    // Check if session exists (would be on authenticated pages)
    // If we can fetch from API without 401, user is authenticated
    return true; // Will be validated when first API call is made
  }

  /**
   * Hide the entire widget container
   */
  hideWidget() {
    const container = document.getElementById('aiWidgetContainer');
    if (container) {
      container.style.display = 'none';
    }
  }

  init() {
    // Event listeners
    this.button.addEventListener('click', () => this.togglePanel());
    this.closeButton.addEventListener('click', () => this.closePanel());
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  togglePanel() {
    if (this.panel.style.display === 'none') {
      this.openPanel();
    } else {
      this.closePanel();
    }
  }

  openPanel() {
    this.panel.style.display = 'flex';
    this.inputField.focus();
  }

  closePanel() {
    this.panel.style.display = 'none';
  }

  async sendMessage() {
    const message = this.inputField.value.trim();

    if (!message) return;
    if (this.isWaitingForResponse) return;

    // Add user message to chat
    this.addMessage(message, 'user');
    this.inputField.value = '';
    this.inputField.focus();

    // Clear empty state
    if (this.chatHistory.length === 1) {
      this.messagesContainer.innerHTML = '';
    }

    // Show loading
    this.showLoading();
    this.isWaitingForResponse = true;

    try {
      // Call AI endpoint
      const response = await fetch('/api/ai/generate-announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request: message })
      });

      const data = await response.json();

      // Remove loading
      this.removeLoading();

      if (response.ok && data.success) {
        // Add AI response
        this.addMessage(data.message, 'assistant');

        // Store suggestion for later use
        this.lastSuggestion = data.suggestion;

        // Show suggestion with buttons
        this.showSuggestion(data.suggestion);
      } else {
        // Error response
        this.addMessage(
          '❌ ' + (data.message || 'Failed to generate announcement. Please try again.'),
          'assistant'
        );
      }
    } catch (error) {
      this.removeLoading();
      console.error('AI Widget Error:', error);
      this.addMessage('❌ Connection error. Please try again.', 'assistant');
    }

    this.isWaitingForResponse = false;
  }

  addMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'ai-message-bubble';
    bubble.textContent = text;

    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);

    // Store in history
    this.chatHistory.push({ text, role });

    // Auto-scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  showLoading() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message assistant';
    messageDiv.id = 'aiLoadingMessage';

    const bubble = document.createElement('div');
    bubble.className = 'ai-message-bubble';

    const loading = document.createElement('div');
    loading.className = 'ai-loading';
    loading.innerHTML = '<span></span><span></span><span></span>';

    bubble.appendChild(loading);
    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  removeLoading() {
    const loadingMessage = document.getElementById('aiLoadingMessage');
    if (loadingMessage) {
      loadingMessage.remove();
    }
  }

  showSuggestion(suggestion) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message assistant';

    const bubble = document.createElement('div');
    bubble.className = 'ai-message-bubble';

    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'ai-suggestion-box';

    const title = document.createElement('div');
    title.className = 'ai-suggestion-title';
    title.textContent = '✨ Suggestion Ready';

    const details = document.createElement('div');
    details.style.fontSize = '12px';
    details.innerHTML = `
      <strong>${suggestion.title || 'Announcement'}</strong><br>
      <small style="color: var(--text-muted);">Channel: ${suggestion.channel || 'Select channel'}</small>
    `;

    const actions = document.createElement('div');
    actions.className = 'ai-suggestion-action';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'ai-suggestion-button apply';
    applyBtn.textContent = '✓ Apply';
    applyBtn.addEventListener('click', () => this.applySuggestion(suggestion));

    const resetBtn = document.createElement('button');
    resetBtn.className = 'ai-suggestion-button reset';
    resetBtn.textContent = '↻ Discard';
    resetBtn.addEventListener('click', () => this.discardSuggestion());

    actions.appendChild(applyBtn);
    actions.appendChild(resetBtn);

    suggestionBox.appendChild(title);
    suggestionBox.appendChild(details);
    suggestionBox.appendChild(actions);

    bubble.appendChild(suggestionBox);
    messageDiv.appendChild(bubble);
    this.messagesContainer.appendChild(messageDiv);

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  applySuggestion(suggestion) {
    if (!suggestion) return;

    // Fill scheduler form fields
    const fields = {
      'embedTitle': suggestion.title,
      'embedDescription': suggestion.description,
      'embedColor': suggestion.color
    };

    for (const [fieldId, value] of Object.entries(fields)) {
      const field = document.getElementById(fieldId);
      if (field && value) {
        field.value = value;
        // Trigger change event for any listeners
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Handle channel selection if possible
    if (suggestion.channel) {
      const channelSelect = document.querySelector('select[name="channel"]') ||
                           document.querySelector('#channelSelect');
      if (channelSelect) {
        channelSelect.value = suggestion.channel;
        channelSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Handle mentions if present
    if (suggestion.mentions && Array.isArray(suggestion.mentions)) {
      const mentionContainer = document.querySelector('[data-mention-roles]');
      if (mentionContainer) {
        suggestion.mentions.forEach(mention => {
          const option = Array.from(mentionContainer.options).find(o => o.value === mention);
          if (option) option.selected = true;
        });
        mentionContainer.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    this.addMessage('✅ Form filled! Review and adjust as needed before sending.', 'system');
  }

  discardSuggestion() {
    this.lastSuggestion = null;
    this.addMessage('Suggestion discarded. Let me know if you need help with something else!', 'system');
  }
}

// Initialize AI Widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.aiAssistant = new AIAssistant();
});
