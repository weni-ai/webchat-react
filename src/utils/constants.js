/**
 * Constants for the Weni Webchat Template
 * TODO: Add all constants used across the application
 * TODO: Sync with service constants where applicable
 */

export const EVENTS = {
  // Connection events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  
  // Message events
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_ERROR: 'message:error',
  
  // Typing events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  
  // State events
  STATE_CHANGED: 'state:changed',
  
  // Session events
  SESSION_CLEARED: 'session:cleared',
  SESSION_RESTORED: 'session:restored',
  
  // Error events
  ERROR: 'error'
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  FILE: 'file',
  LOCATION: 'location',
  QUICK_REPLY: 'quick_reply'
};

export const MESSAGE_SENDER = {
  CLIENT: 'client',
  AGENT: 'agent',
  BOT: 'bot'
};

export const STORAGE_KEYS = {
  SESSION_ID: 'weni_webchat_session_id',
  MESSAGES: 'weni_webchat_messages',
  CONTEXT: 'weni_webchat_context',
  USER_DATA: 'weni_webchat_user_data'
};

export const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

export const WIDGET_POSITIONS = {
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left',
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left'
};

export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
  AUDIO: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default {
  EVENTS,
  MESSAGE_TYPES,
  MESSAGE_SENDER,
  STORAGE_KEYS,
  CONNECTION_STATUS,
  WIDGET_POSITIONS,
  FILE_TYPES,
  MAX_FILE_SIZE
};


