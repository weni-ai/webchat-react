/**
 * Voice mode orchestrator.
 * Coordinate AudioCapture, STTConnection, TTSPlayer, TextChunker, and EchoGuard
 * through a 6-state machine: idle → initializing → listening → processing → speaking → error.
 *
 * Authentication uses single-use tokens obtained via `config.getTokens()`.
 * Neither the ElevenLabs API key nor long-lived credentials ever reach the browser.
 */

import { AudioCapture } from './AudioCapture';
import { STTConnection } from './STTConnection';
import { TTSPlayer } from './TTSPlayer';
import { TextChunker } from './TextChunker';
import { EchoGuard } from './EchoGuard';
import { VoiceError, VoiceErrorCode, createVoiceError } from './errors';
import { mergeVoiceConfig, buildTTSWebSocketURL } from './config';

export const VoiceSessionState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error',
};

let idCounter = 0;
function generateSessionId() {
  idCounter += 1;
  return `voice-${Date.now()}-${idCounter}`;
}

const NON_SPEAKABLE = /^[\p{Emoji}\s]+$|^https?:\/\/\S+$|^```[\s\S]*```$/u;

export class VoiceService {
  static NON_SPEAKABLE = NON_SPEAKABLE;

  constructor() {
    this.config = null;
    this.state = VoiceSessionState.IDLE;
    this.sessionId = null;
    this.sessionStartTime = null;
    this.audioCapture = null;
    this.sttConnection = null;
    this.ttsPlayer = null;
    this.textChunker = null;
    this.echoGuard = null;
    this.partialTranscript = '';
    this.error = null;
    this.currentTokens = null;
    this.listeners = new Map();
    this.onMessageCallback = null;
  }

  /** Check browser support for voice mode. */
  static isSupported() {
    return (
      AudioCapture.isSupported() &&
      typeof WebSocket !== 'undefined' &&
      typeof (window.AudioContext || window.webkitAudioContext) !== 'undefined'
    );
  }

  /**
   * Initialize with merged config and create sub-components.
   * @param {object} config - User voice configuration
   */
  async init(config) {
    this.config = mergeVoiceConfig(config);

    this.audioCapture = new AudioCapture();
    this.ttsPlayer = new TTSPlayer({
      getConnectionUrl: () => this._buildTTSConnectionUrl(),
    });
    this.textChunker = new TextChunker();
    this.echoGuard = new EchoGuard({
      cooldownMs: 350,
      consecutiveFramesRequired: 2,
      normalThreshold: 0.02,
      elevatedThreshold: 0.06,
    });

    this._wireAudioCaptureListeners();
    this._wireTTSListeners();
  }

  /**
   * Start a voice session: acquire mic, connect STT + TTS, begin listening.
   * @returns {{ id: string, startedAt: number }}
   */
  async startSession() {
    if (this.state !== VoiceSessionState.IDLE) {
      throw createVoiceError(
        VoiceErrorCode.UNKNOWN_ERROR,
        'Cannot start session: not in IDLE state',
      );
    }

    this.setState(VoiceSessionState.INITIALIZING);

    try {
      this.currentTokens = await this.config.getTokens();

      this.sttConnection = new STTConnection(
        this.config,
        this.currentTokens.sttToken,
      );

      await this.audioCapture.start({ vadThreshold: this.config.vadThreshold });

      await this.sttConnection.connect();
      this._wireSTTListeners();

      const ttsUrl = buildTTSWebSocketURL(
        this.config.voiceId,
        this.config,
        this.currentTokens.ttsToken,
      );
      await this.ttsPlayer.connect(ttsUrl);

      this.sessionId = generateSessionId();
      this.sessionStartTime = Date.now();

      this.setState(VoiceSessionState.LISTENING);
      this.emit('session:started', {
        id: this.sessionId,
        startedAt: this.sessionStartTime,
      });
      this.emit('listening:started');

      return { id: this.sessionId, startedAt: this.sessionStartTime };
    } catch (err) {
      this.error =
        err instanceof VoiceError
          ? err
          : createVoiceError(VoiceErrorCode.UNKNOWN_ERROR, err);
      this.setState(VoiceSessionState.ERROR);
      this.emit('error', this.error);
      throw this.error;
    }
  }

  /** End the current session and release all resources. */
  endSession() {
    const duration = this.sessionStartTime
      ? Date.now() - this.sessionStartTime
      : 0;
    const prevSessionId = this.sessionId;

    this.audioCapture?.stop();
    this.sttConnection?.disconnect();
    this.ttsPlayer?.stop(true);
    this.ttsPlayer?.disconnect();
    this.textChunker?.clear();
    this.echoGuard?.reset();

    this.partialTranscript = '';
    this.error = null;
    this.currentTokens = null;
    this.sessionId = null;
    this.sessionStartTime = null;
    this.sttConnection = null;

    this.setState(VoiceSessionState.IDLE);
    this.emit('session:ended', { sessionId: prevSessionId, duration });
    this.emit('listening:stopped');
  }

  /**
   * Feed agent text into the TextChunker → TTSPlayer pipeline.
   * @param {string} textChunk - Incoming text fragment
   * @param {boolean} [isComplete=false] - Whether this is the final fragment
   */
  processTextChunk(textChunk, isComplete = false) {
    if (!this.textChunker || !this.ttsPlayer) return;
    if (VoiceService.NON_SPEAKABLE.test(textChunk)) return;

    const chunk = this.textChunker.addText(textChunk);
    if (chunk) this._speak(chunk);

    if (isComplete) {
      const remaining = this.textChunker.flush();
      if (remaining) this._speak(remaining);
    }
  }

  /**
   * Stop TTS playback.
   * @param {boolean} [immediate=true]
   */
  stopSpeaking(immediate = true) {
    this.ttsPlayer?.stop(immediate);
    this.textChunker?.clear();
  }

  /** Register the callback invoked when STT commits a transcript. */
  setMessageCallback(callback) {
    this.onMessageCallback = callback;
  }

  /** Update language for subsequent STT/TTS requests. */
  setLanguage(languageCode) {
    if (this.config && languageCode) {
      this.config.languageCode = languageCode.split('-')[0].toLowerCase();
    }
  }

  /** Return current session info or null if inactive. */
  getSession() {
    if (!this.sessionId) return null;
    return {
      id: this.sessionId,
      state: this.state,
      startedAt: this.sessionStartTime,
      config: this.config,
      partialTranscript: this.partialTranscript,
      isPlaying: this.ttsPlayer?.isPlaying ?? false,
      error: this.error,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal: state, events, wiring
  // ---------------------------------------------------------------------------

  /** @private */
  setState(newState) {
    if (this.state === newState) return;
    const previousState = this.state;
    this.state = newState;
    this.emit('state:changed', { state: newState, previousState });
  }

  /** @private */
  _wireAudioCaptureListeners() {
    this.audioCapture.on('audioData', (data) => {
      if (this.state === VoiceSessionState.SPEAKING) {
        const hasVoiceAtThreshold =
          data.energy > this.echoGuard.bargeInThreshold;
        if (this.echoGuard.shouldTriggerBargeIn(hasVoiceAtThreshold)) {
          this._handleBargeIn();
          return;
        }
      }

      if (
        this.echoGuard.shouldForwardAudio() &&
        this.sttConnection?.isConnected()
      ) {
        this.sttConnection.sendAudio(data.data, data.sampleRate, false);
      }
    });

    this.audioCapture.on('voiceActivity', (data) => {
      if (data.speaking && this.state === VoiceSessionState.LISTENING) {
        this.setState(VoiceSessionState.PROCESSING);
      }
    });
  }

  /** @private */
  _wireSTTListeners() {
    const stt = this.sttConnection;

    stt.on('partial', (data) => {
      this.partialTranscript = data.text;
      this.emit('transcript:partial', { text: data.text });
    });

    stt.on('committed', (data) => {
      const text = data.text?.trim();
      if (text) {
        this.partialTranscript = '';
        this.emit('transcript:committed', { text });
        this.onMessageCallback?.(text);
      }
      this.setState(VoiceSessionState.LISTENING);
    });

    stt.on('error', (err) => {
      this.error =
        err instanceof VoiceError
          ? err
          : createVoiceError(VoiceErrorCode.STT_TRANSCRIPTION_FAILED, err);
      this.emit('error', this.error);
    });

    stt.on('close', () => {
      const reconnectStates = [
        VoiceSessionState.LISTENING,
        VoiceSessionState.PROCESSING,
        VoiceSessionState.SPEAKING,
      ];
      if (reconnectStates.includes(this.state)) {
        this._reconnectSTT();
      }
    });
  }

  /** @private */
  async _reconnectSTT() {
    try {
      this.currentTokens = await this.config.getTokens();
      const newStt = new STTConnection(
        this.config,
        this.currentTokens.sttToken,
      );
      await newStt.connect();
      this.sttConnection = newStt;
      this._wireSTTListeners();
    } catch (err) {
      const voiceErr =
        err instanceof VoiceError
          ? err
          : createVoiceError(VoiceErrorCode.STT_CONNECTION_FAILED, err);
      this.error = voiceErr;
      this.emit('error', voiceErr);
      this.setState(VoiceSessionState.ERROR);
    }
  }

  /**
   * Build a fresh TTS WebSocket URL.  Called by TTSPlayer when it needs
   * to (re)connect — fetches new tokens automatically.
   * @private
   * @returns {Promise<string>}
   */
  async _buildTTSConnectionUrl() {
    this.currentTokens = await this.config.getTokens();
    return buildTTSWebSocketURL(
      this.config.voiceId,
      this.config,
      this.currentTokens.ttsToken,
    );
  }

  /** @private Wire permanent TTS listeners once during init. */
  _wireTTSListeners() {
    this.ttsPlayer.on('queue:drained', () => {
      this.echoGuard.onTTSStopped();
      if (this.state === VoiceSessionState.SPEAKING) {
        this.setState(VoiceSessionState.LISTENING);
        this.emit('speaking:ended');
        this.emit('listening:started');
      }
    });
  }

  /** @private */
  _speak(text) {
    this.echoGuard.onTTSStarted();
    this.setState(VoiceSessionState.SPEAKING);
    this.emit('speaking:started', { text });

    this.ttsPlayer.speak(text).catch((err) => {
      if (this.state !== VoiceSessionState.SPEAKING) return;

      this.emit(
        'error',
        createVoiceError(VoiceErrorCode.TTS_GENERATION_FAILED, err),
      );
      this.echoGuard.onTTSStopped();
      this.setState(VoiceSessionState.LISTENING);
      this.emit('listening:started');
    });
  }

  /** @private */
  _handleBargeIn() {
    this.setState(VoiceSessionState.LISTENING);
    this.ttsPlayer?.stop(false, true);
    this.textChunker?.clear();
    this.echoGuard.onBargeInDetected();
    this.audioCapture?.resetSpeakingState();
    this.emit('barge-in');
  }

  // ---------------------------------------------------------------------------
  // Event system
  // ---------------------------------------------------------------------------

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return this;
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
    return this;
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch {
        /* listener errors must not break orchestrator */
      }
    });
  }

  removeAllListeners() {
    this.listeners.clear();
  }

  /** Tear down everything and release all references. */
  destroy() {
    this.endSession();
    this.audioCapture?.destroy();
    this.ttsPlayer?.destroy();
    this.echoGuard?.destroy();
    this.audioCapture = null;
    this.ttsPlayer = null;
    this.textChunker = null;
    this.echoGuard = null;
    this.onMessageCallback = null;
    this.removeAllListeners();
    this.config = null;
  }
}
