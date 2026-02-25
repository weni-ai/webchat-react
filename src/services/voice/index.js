/**
 * Voice Services Module
 *
 * Export all voice-related services for the Full Voice Mode feature.
 */

export { VoiceService, VoiceSessionState } from './VoiceService';
export { AudioCapture } from './AudioCapture';
export { STTConnection } from './STTConnection';
export { TTSPlayer } from './TTSPlayer';
export { TextChunker } from './TextChunker';
export { EchoGuard } from './EchoGuard';
export { VoiceError, VoiceErrorCode, createVoiceError } from './errors';
export {
  DEFAULT_VOICE_CONFIG,
  validateVoiceConfig,
  mergeVoiceConfig,
  buildSTTWebSocketURL,
  buildTTSStreamURL,
  buildTTSRequestBody,
} from './config';
