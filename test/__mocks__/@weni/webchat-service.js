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
    return;
  }
  connect() {}
  disconnect() {}

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
  sendMessage(text) {
    this.state.messages.push({
      direction: 'outgoing',
      text,
      timestamp: Date.now(),
    });
    this.emit('state:changed', this.getState());
  }

  sendAttachment(_file) {}

  simulateMessageReceived(payload) {
    const text = payload?.message?.text ?? '';
    this.state.messages.push({
      direction: 'incoming',
      message: { text },
      timestamp: Date.now(),
    });
    this.emit('message:received', text);
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

module.exports = WeniWebchatService;
