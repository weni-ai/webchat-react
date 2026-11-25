class WeniWebchatService {
  constructor(config) {
    this.config = config;
    WeniWebchatService.latest = this;
    globalThis.__webchatServiceLatest = this;
    this.listeners = {};
    this.state = {
      messages: [],
      connection: { status: "connected" },
      isThinking: false,
      thinkingText: null,
    };
    this.session = { isChatOpen: false };
    this.isAudioRecordingSupported = true;
    this._connected = false;
    this._connecting = false;
    this._renderEnabled = true;
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
    const shouldRender = this.config._shouldRender !== false;
    this._renderEnabled = shouldRender;
    if (!shouldRender) {
      return { shouldRender: false };
    }
    if (this.config.connectOn === "mount") {
      this.connect();
    }
    return { shouldRender: true };
  }

  isRenderEnabled() {
    return this._renderEnabled !== false;
  }
  connect() {
    WeniWebchatService.connectCalls =
      (WeniWebchatService.connectCalls || 0) + 1;
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

  _applyState(partial) {
    const next = { ...this.state, ...partial };
    if (next.isThinking === false) {
      next.thinkingText = null;
    }
    this.state = next;
    this.emit("state:changed", this.getState());
  }

  setThinking(isThinking) {
    this._applyState({ isThinking });
  }

  setThinkingText(text) {
    this._applyState({ isThinking: true, thinkingText: text });
  }
  getMessages() {
    return this.state.messages;
  }
  getSession() {
    return this.session;
  }
  setIsChatOpen(isOpen) {
    this.session = { ...(this.session || {}), isChatOpen: isOpen };
    this.emit("chat:open:changed", isOpen);
  }

  // Messaging
  sendMessage(text, options = {}) {
    WeniWebchatService.sendCalls = (WeniWebchatService.sendCalls || 0) + 1;
    this.state.messages.push({
      direction: "outgoing",
      text,
      timestamp: Date.now(),
      ...options,
    });
    this.emit("state:changed", this.getState());
  }

  sendAttachment(_file) {}

  /**
   * Mirrors @weni/webchat-service: after MessageProcessor, emits MESSAGE_RECEIVED
   * with a normalized Message object ({ id, type, text, direction, status, ... }),
   * not a bare string.
   */
  simulateMessageReceived(payload) {
    WeniWebchatService.simulatedCalls =
      (WeniWebchatService.simulatedCalls || 0) + 1;
    const text = payload?.message?.text ?? payload?.text ?? "";
    const message = {
      id: payload?.id || payload?.message?.messageId || `sim_${Date.now()}`,
      type: "text",
      text,
      timestamp: Date.now(),
      direction: "incoming",
      status: "delivered",
      persisted: true,
    };
    this.state.messages.push(message);
    this.emit("message:received", message);
    this.emit("state:changed", this.getState());
  }

  emitStreamMessage(message) {
    const normalized = {
      id: message.id || `stream_${Date.now()}`,
      type: "text",
      text: "",
      timestamp: Date.now(),
      direction: "incoming",
      status: "streaming",
      streamPhase: "streaming_text",
      ...message,
    };
    const nextMessages = [...this.state.messages, normalized];
    this._applyState({ messages: nextMessages, isThinking: false });
    this.emit("message:received", normalized);
    return normalized;
  }

  updateStreamMessage(messageId, updates) {
    let updatedMessage = null;
    const nextMessages = this.state.messages.map((msg) => {
      if (msg.id !== messageId) return msg;
      updatedMessage = { ...msg, ...updates };
      return updatedMessage;
    });
    this._applyState({ messages: nextMessages });
    if (updatedMessage) {
      this.emit("message:updated", messageId, updates);
    }
    return updatedMessage;
  }

  simulateStreamDisconnect() {
    const nextMessages = this.state.messages.map((msg) => {
      if (msg.status !== "streaming") return msg;
      const { componentHints: _hints, ...rest } = msg;
      return {
        ...rest,
        status: "delivered",
        streamPhase: "completed",
      };
    });
    this._applyState({
      messages: nextMessages,
      connection: { status: "disconnected" },
    });
  }

  loadHistoryMessages(messages) {
    this._applyState({ messages: [...messages] });
    this.emit("history:loaded", messages);
  }

  // Audio
  async startRecording() {
    this.emit("recording:started");
  }
  async stopRecording() {
    this.emit("recording:stopped");
  }
  cancelRecording() {
    this.emit("recording:cancelled");
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
    this.emit("camera:recording:started");
  }
  stopCameraRecording() {
    this.isCameraRecording = false;
    this.emit("camera:recording:stopped");
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

  evaluateBackInStockOffer = jest.fn(() => ({
    isUnavailable: false,
    skuId: "",
    seller: "1",
  }));

  validateBackInStockContact = jest.fn(() => ({ isValid: true, errors: {} }));

  subscribeBackInStock = jest.fn(() => Promise.resolve({ accepted: true }));
}

// Mirrors the real package, which exposes the constants both as static
// properties on the class and as named module exports.
WeniWebchatService.CONNECTION_STATUS = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
};

WeniWebchatService.MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  FILE: "file",
  LOCATION: "location",
  INTERACTIVE: "interactive",
  CONVERSATION_STATUS: "conversation_status",
  TYPING: "typing",
};

WeniWebchatService.MESSAGE_DIRECTIONS = {
  INCOMING: "incoming",
  OUTGOING: "outgoing",
};

WeniWebchatService.MESSAGE_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  STREAMING: "streaming",
  ERROR: "error",
};

module.exports = WeniWebchatService;
