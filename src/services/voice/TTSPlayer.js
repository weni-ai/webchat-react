/**
 * ElevenLabs TTS HTTP streaming with Web Audio API playback.
 * Queue text for speech synthesis, stream audio, and manage playback.
 */

import { buildTTSStreamURL, buildTTSRequestBody } from './config';
import { VoiceError, VoiceErrorCode, getTTSErrorCode } from './errors';
import { mergeAudioChunks } from '@/utils/audioUtils';

const FADE_OUT_DURATION = 0.15;
const BARGE_IN_FADE_DURATION = 0.02;

class TTSPlayer {
  constructor() {
    this._audioContext = null;
    this._gainNode = null;
    this._currentSource = null;
    this._abortController = null;
    this._ttsQueue = [];
    this._isProcessingTTS = false;
    this._listeners = new Map();

    this.isPlaying = false;
    this.isStopped = false;
    this.previousText = '';
  }

  /**
   * Queue text for TTS synthesis and playback.
   * @param {string} text - Text to speak
   * @param {object} [options={}] - TTS options (voiceId, apiKey, etc.)
   * @returns {Promise<void>}
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      this.isStopped = false;
      this._ttsQueue.push({ text, options, resolve, reject });

      if (!this._isProcessingTTS) {
        this._processTTSQueue();
      }
    });
  }

  /**
   * Stop playback and clear the queue.
   * @param {boolean} [immediate=false] - Skip fade-out
   * @param {boolean} [bargeIn=false] - Use fast fade for barge-in
   */
  stop(immediate = false, bargeIn = false) {
    this.isStopped = true;
    this.isPlaying = false;
    this._isProcessingTTS = false;

    this._rejectPendingQueue('Playback stopped');
    this._ttsQueue = [];

    if (this._abortController) {
      try {
        this._abortController.abort();
      } catch {
        // Already aborted
      }
      this._abortController = null;
    }

    if (bargeIn) {
      this._fadeAndStop(BARGE_IN_FADE_DURATION);
      this.clearPreviousText();
    } else if (immediate) {
      this._stopSource();
      this._resetGain();
    } else {
      this._fadeAndStop(FADE_OUT_DURATION);
    }
  }

  /**
   * Reset the previous text context for TTS continuity.
   */
  clearPreviousText() {
    this.previousText = '';
  }

  /**
   * Stop all playback, close audio context, and remove listeners.
   */
  destroy() {
    this.stop(true);
    this.removeAllListeners();

    if (this._audioContext) {
      try {
        this._audioContext.close();
      } catch {
        // Already closed
      }
      this._audioContext = null;
      this._gainNode = null;
    }
  }

  // -- Event emitter methods --

  /**
   * Register a listener for an event.
   * @param {string} event
   * @param {Function} listener
   * @returns {TTSPlayer}
   */
  on(event, listener) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(listener);
    return this;
  }

  /**
   * Register a one-time listener that auto-removes after the first invocation.
   * @param {string} event
   * @param {Function} listener
   * @returns {TTSPlayer}
   */
  once(event, listener) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove a listener for an event.
   * @param {string} event
   * @param {Function} listener
   * @returns {TTSPlayer}
   */
  off(event, listener) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
    return this;
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param {...*} args
   */
  emit(event, ...args) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch {
        // Prevent listener errors from breaking playback
      }
    }
  }

  /**
   * Remove all listeners, optionally for a specific event.
   * @param {string} [event]
   */
  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  // -- Private methods --

  /**
   * Process queued TTS requests sequentially.
   * @private
   */
  async _processTTSQueue() {
    this._isProcessingTTS = true;

    while (this._ttsQueue.length > 0 && !this.isStopped) {
      const { text, options, resolve, reject } = this._ttsQueue.shift();
      try {
        await this._speakImmediate(text, options);
        resolve();
      } catch (err) {
        reject(err);
      }
    }

    this._isProcessingTTS = false;
    if (!this.isStopped) {
      this.emit('queue:drained');
    }
  }

  /**
   * Stream and play a single TTS request.
   * @param {string} text
   * @param {object} options
   * @private
   */
  async _speakImmediate(text, options) {
    this._initAudioContext();
    this._abortController = new AbortController();

    const url = buildTTSStreamURL(options.voiceId, options);
    const body = buildTTSRequestBody(text, options, this.previousText);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': options.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: this._abortController.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      const errorCode = getTTSErrorCode(err);
      throw new VoiceError(errorCode, err.message, err);
    }

    if (!response.ok) {
      const errorCode = getTTSErrorCode(response);
      let detail = `TTS request failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.detail?.message) {
          detail = errorBody.detail.message;
        }
      } catch {
        // Use default detail
      }
      throw new VoiceError(errorCode, detail);
    }

    this.isPlaying = true;
    this.emit('started', { text });

    try {
      const audioBuffer = await this._streamToBuffer(response);
      if (this.isStopped) return;

      await this._playBuffer(audioBuffer);
      this.previousText = text;
    } catch (err) {
      if (err.name === 'AbortError' || this.isStopped) return;
      const errorCode = getTTSErrorCode(err);
      const voiceError = new VoiceError(errorCode, err.message, err);
      this.emit('error', voiceError);
      throw voiceError;
    } finally {
      this.isPlaying = false;
    }

    this.emit('ended');
  }

  /**
   * Read the fetch response stream into a merged AudioBuffer.
   * @param {Response} response
   * @returns {Promise<AudioBuffer>}
   * @private
   */
  async _streamToBuffer(response) {
    const reader = response.body.getReader();
    const chunks = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value.buffer);
      }
    } finally {
      reader.releaseLock();
    }

    const merged = mergeAudioChunks(chunks);
    return this._audioContext.decodeAudioData(merged);
  }

  /**
   * Play a decoded AudioBuffer through the gain node.
   * @param {AudioBuffer} audioBuffer
   * @returns {Promise<void>}
   * @private
   */
  _playBuffer(audioBuffer) {
    return new Promise((resolve, reject) => {
      if (this.isStopped || !this._audioContext) {
        resolve();
        return;
      }

      const source = this._audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this._gainNode);
      this._currentSource = source;

      source.onended = () => {
        this._currentSource = null;
        resolve();
      };

      try {
        source.start(0);
      } catch (err) {
        this._currentSource = null;
        reject(err);
      }
    });
  }

  /**
   * Create AudioContext and GainNode if not already initialized.
   * @private
   */
  _initAudioContext() {
    if (this._audioContext) return;

    this._audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    this._gainNode = this._audioContext.createGain();
    this._gainNode.connect(this._audioContext.destination);
  }

  /**
   * Apply an exponential fade-out then stop the current source.
   * @param {number} duration - Fade duration in seconds
   * @private
   */
  _fadeAndStop(duration) {
    if (!this._gainNode || !this._audioContext) {
      this._stopSource();
      return;
    }

    const now = this._audioContext.currentTime;
    this._gainNode.gain.setValueAtTime(this._gainNode.gain.value, now);
    this._gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    setTimeout(() => {
      this._stopSource();
      this._resetGain();
    }, duration * 1000);
  }

  /**
   * Immediately stop the current audio source.
   * @private
   */
  _stopSource() {
    if (this._currentSource) {
      try {
        this._currentSource.stop();
      } catch {
        // Already stopped
      }
      this._currentSource = null;
    }
  }

  /**
   * Reset gain to 1.0 for future playback.
   * @private
   */
  _resetGain() {
    if (this._gainNode && this._audioContext) {
      this._gainNode.gain.cancelScheduledValues(this._audioContext.currentTime);
      this._gainNode.gain.setValueAtTime(1, this._audioContext.currentTime);
    }
  }

  /**
   * Reject all pending queue entries.
   * @param {string} reason
   * @private
   */
  _rejectPendingQueue(reason) {
    for (const entry of this._ttsQueue) {
      try {
        entry.reject(
          new VoiceError(VoiceErrorCode.TTS_GENERATION_FAILED, reason),
        );
      } catch {
        // Ignore
      }
    }
  }
}

export { TTSPlayer };
export default TTSPlayer;
