class WeniWebchatService {
  constructor(config) {
    this.config = config;
    this.listeners = {};
    this.state = {
      messages: [],
      connection: { status: 'connected' },
    };
    this.session = { isChatOpen: false };
    this.isAudioRecordingSupported = true;
    this._connected = false;
    this._connecting = false;
  }

  // Event helpers
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  off(event, cb) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((fn) => fn !== cb);
  }

  removeAllListeners() {
    this.listeners = {};
  }

  emit(event, ...args) {
    (this.listeners[event] || []).forEach((fn) => fn(...args));
  }

  // Lifecycle
  async init() {
    if (this.config.connectOn === 'mount') {
      this.connect();
    }
    return { shouldRender: true };
  }
  connect() {
    if (this._connected || this._connecting) return;
    this._connecting = true;
    this._connected = true;
    this._connecting = false;
  }
  disconnect() {
    this._connected = false;
  }
  reconnectNow() {
    return this.connect();
  }

  // State
  getState() {
    return this.state;
  }
  getMessages() {
    return this.state.messages;
  }
  getSession() {
    return this.session;
  }
  setIsChatOpen(isOpen) {
    this.session = { ...(this.session || {}), isChatOpen: isOpen };
    this.emit('chat:open:changed', isOpen);
  }

  // Messaging
  sendMessage(text, options = {}) {
    this.state.messages.push({
      direction: 'outgoing',
      text,
      timestamp: Date.now(),
      ...options,
    });
    this.emit('state:changed', this.getState());
  }

  sendAttachment(_file) {}

  /**
   * Mirrors @weni/webchat-service: after MessageProcessor, emits MESSAGE_RECEIVED
   * with a normalized Message object ({ id, type, text, direction, status, ... }),
   * not a bare string.
   */
  simulateMessageReceived(payload) {
    const text = payload?.message?.text ?? payload?.text ?? '';
    const message = {
      id: payload?.id || payload?.message?.messageId || `sim_${Date.now()}`,
      type: 'text',
      text,
      timestamp: Date.now(),
      direction: 'incoming',
      status: 'delivered',
      persisted: true,
    };
    this.state.messages.push(message);
    this.emit('message:received', message);
    this.emit('state:changed', this.getState());
  }

  // Audio
  async startRecording() {
    this.emit('recording:started');
  }
  async stopRecording() {
    this.emit('recording:stopped');
  }
  cancelRecording() {
    this.emit('recording:cancelled');
  }
  hasAudioPermission() {
    return true;
  }
  requestAudioPermission() {
    return true;
  }

  // Camera
  isCameraRecording = false;
  startCameraRecording() {
    this.isCameraRecording = true;
    this.emit('camera:recording:started');
  }
  stopCameraRecording() {
    this.isCameraRecording = false;
    this.emit('camera:recording:stopped');
  }
  switchToNextCameraDevice() {}
  hasCameraPermission() {
    return true;
  }
  requestCameraPermission() {
    return true;
  }

  // Files
  getFileConfig() {
    return {};
  }
}

// Mirrors the real package, which exposes the constants both as static
// properties on the class and as named module exports.
WeniWebchatService.CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

WeniWebchatService.MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  LOCATION: 'location',
  INTERACTIVE: 'interactive',
  CONVERSATION_STATUS: 'conversation_status',
  TYPING: 'typing',
};

WeniWebchatService.MESSAGE_DIRECTIONS = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
};

WeniWebchatService.MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  STREAMING: 'streaming',
  ERROR: 'error',
};

module.exports = WeniWebchatService;
