/**
 * Voice configuration defaults, validation, and API URL builders.
 */

import { VoiceError, VoiceErrorCode } from './errors';

const VALID_TTS_MODELS = ['eleven_flash_v2_5', 'eleven_multilingual_v2'];
const VALID_AUDIO_FORMATS = ['mp3_44100_128', 'pcm_24000'];

export const DEFAULT_VOICE_CONFIG = {
  voiceId: '',
  languageCode: 'en',
  ttsModel: 'eleven_flash_v2_5',
  sttModel: 'scribe_v2_realtime',
  audioFormat: 'mp3_44100_128',
  sampleRate: 16000,
  silenceThreshold: 1.5,
  vadThreshold: 0.02,
  bargeInVadThreshold: 0.08,
  sttVadThreshold: 0.4,
  minSpeechDuration: 100,
  minSilenceDuration: 100,
  latencyOptimization: 3,
  enableBargeIn: true,
  autoListen: true,
  getToken: null,
  getApiKey: null,
  texts: {
    title: '',
    listening: '',
    microphoneHint: '',
    speaking: '',
    processing: '',
    errorTitle: '',
  },
};

/**
 * Validate a voice configuration object.
 * @param {object} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateVoiceConfig(config) {
  const errors = [];

  if (!config.voiceId || typeof config.voiceId !== 'string') {
    errors.push('voiceId is required and must be a non-empty string');
  }

  if (typeof config.getToken !== 'function') {
    errors.push('getToken must be a function');
  }

  if (typeof config.getApiKey !== 'function') {
    errors.push('getApiKey must be a function');
  }

  if (
    typeof config.silenceThreshold !== 'number' ||
    config.silenceThreshold < 0.3 ||
    config.silenceThreshold > 3.0
  ) {
    errors.push('silenceThreshold must be a number between 0.3 and 3.0');
  }

  if (
    typeof config.vadThreshold !== 'number' ||
    config.vadThreshold < 0.01 ||
    config.vadThreshold > 0.5
  ) {
    errors.push('vadThreshold must be a number between 0.01 and 0.5');
  }

  if (
    !Number.isInteger(config.latencyOptimization) ||
    config.latencyOptimization < 0 ||
    config.latencyOptimization > 4
  ) {
    errors.push('latencyOptimization must be an integer between 0 and 4');
  }

  if (!VALID_TTS_MODELS.includes(config.ttsModel)) {
    errors.push(`ttsModel must be one of: ${VALID_TTS_MODELS.join(', ')}`);
  }

  if (!VALID_AUDIO_FORMATS.includes(config.audioFormat)) {
    errors.push(
      `audioFormat must be one of: ${VALID_AUDIO_FORMATS.join(', ')}`,
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Merge user config with defaults and validate the result.
 * @param {object} userConfig
 * @returns {object} Merged and validated config
 * @throws {VoiceError} If validation fails
 */
export function mergeVoiceConfig(userConfig) {
  const merged = {
    ...DEFAULT_VOICE_CONFIG,
    ...userConfig,
    texts: {
      ...DEFAULT_VOICE_CONFIG.texts,
      ...userConfig?.texts,
    },
  };

  // Normalize language code to ISO 639-1 (strip BCP-47 region suffix).
  if (merged.languageCode) {
    merged.languageCode = merged.languageCode.split('-')[0].toLowerCase();
  }

  const { valid, errors } = validateVoiceConfig(merged);
  if (!valid) {
    throw new VoiceError(
      VoiceErrorCode.UNKNOWN_ERROR,
      `Invalid voice configuration: ${errors.join('; ')}`,
    );
  }

  return merged;
}

/**
 * Build the ElevenLabs STT WebSocket URL with query parameters.
 * @param {object} config
 * @param {string} token
 * @returns {string}
 */
export function buildSTTWebSocketURL(config, token) {
  const base = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
  const params = new URLSearchParams();

  params.set('model_id', config.sttModel);
  params.set('token', token);
  params.set('audio_format', 'pcm_16000');
  params.set('commit_strategy', 'vad');
  params.set('vad_silence_threshold_secs', String(config.silenceThreshold));
  params.set('vad_threshold', String(config.sttVadThreshold));
  params.set('min_speech_duration_ms', String(config.minSpeechDuration));
  params.set('min_silence_duration_ms', String(config.minSilenceDuration));

  if (config.languageCode) {
    params.set('language_code', config.languageCode);
  }

  return `${base}?${params.toString()}`;
}

/**
 * Build the ElevenLabs TTS stream URL with query parameters.
 * @param {string} voiceId
 * @param {object} config
 * @returns {string}
 */
export function buildTTSStreamURL(voiceId, config) {
  const base = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
  const params = new URLSearchParams();

  params.set('output_format', config.audioFormat);
  params.set('optimize_streaming_latency', String(config.latencyOptimization));

  return `${base}?${params.toString()}`;
}

/**
 * Build the TTS request body.
 * @param {string} text
 * @param {object} config
 * @param {string} [previousText]
 * @returns {object}
 */
export function buildTTSRequestBody(text, config, previousText) {
  const body = {
    text,
    model_id: config.ttsModel,
  };

  if (config.languageCode) {
    body.language_code = config.languageCode;
  }

  if (previousText) {
    body.previous_text = previousText;
  }

  return body;
}
