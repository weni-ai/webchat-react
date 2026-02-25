/**
 * Voice error types and utilities.
 * Handle all ElevenLabs API error message_types.
 */

export const VoiceErrorCode = {
  MICROPHONE_PERMISSION_DENIED: 'MICROPHONE_PERMISSION_DENIED',
  MICROPHONE_NOT_FOUND: 'MICROPHONE_NOT_FOUND',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
  STT_CONNECTION_FAILED: 'STT_CONNECTION_FAILED',
  STT_AUTH_FAILED: 'STT_AUTH_FAILED',
  STT_TRANSCRIPTION_FAILED: 'STT_TRANSCRIPTION_FAILED',
  TTS_GENERATION_FAILED: 'TTS_GENERATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

const ERROR_METADATA = {
  [VoiceErrorCode.MICROPHONE_PERMISSION_DENIED]: {
    message: 'O acesso ao microfone foi negado',
    suggestion:
      'Por favor, permita o acesso ao microfone nas configurações do navegador',
    recoverable: true,
  },
  [VoiceErrorCode.MICROPHONE_NOT_FOUND]: {
    message: 'Nenhum microfone foi encontrado',
    suggestion: 'Por favor, conecte um microfone e tente novamente',
    recoverable: false,
  },
  [VoiceErrorCode.BROWSER_NOT_SUPPORTED]: {
    message: 'Seu navegador não suporta o modo de voz',
    suggestion: 'Por favor, use Chrome, Firefox, Safari ou Edge',
    recoverable: false,
  },
  [VoiceErrorCode.STT_CONNECTION_FAILED]: {
    message: 'Não foi possível conectar ao serviço de reconhecimento de voz',
    suggestion: 'Verifique sua conexão e tente novamente',
    recoverable: true,
  },
  [VoiceErrorCode.STT_AUTH_FAILED]: {
    message: 'Autenticação com ElevenLabs falhou',
    suggestion: 'Verifique a API key e as permissões do plano (Scribe v2 Realtime é necessário)',
    recoverable: false,
  },
  [VoiceErrorCode.STT_TRANSCRIPTION_FAILED]: {
    message: 'O reconhecimento de voz falhou',
    suggestion: 'Por favor, tente falar novamente',
    recoverable: true,
  },
  [VoiceErrorCode.TTS_GENERATION_FAILED]: {
    message: 'Não foi possível gerar a fala',
    suggestion: 'A resposta será mostrada como texto',
    recoverable: true,
  },
  [VoiceErrorCode.NETWORK_ERROR]: {
    message: 'Conexão de rede perdida',
    suggestion: 'Por favor, verifique sua conexão com a internet',
    recoverable: true,
  },
  [VoiceErrorCode.TOKEN_EXPIRED]: {
    message: 'A autenticação expirou',
    suggestion: 'Reconectando...',
    recoverable: true,
  },
  [VoiceErrorCode.RATE_LIMITED]: {
    message: 'Muitas solicitações',
    suggestion: 'Por favor, aguarde um momento e tente novamente',
    recoverable: true,
  },
  [VoiceErrorCode.UNKNOWN_ERROR]: {
    message: 'Ocorreu um erro inesperado',
    suggestion: 'Por favor, tente novamente',
    recoverable: true,
  },
};

export class VoiceError extends Error {
  /**
   * Create a voice-specific error with code, metadata, and optional cause.
   * @param {string} code - A VoiceErrorCode value
   * @param {string} [customMessage]
   * @param {Error} [originalError]
   */
  constructor(code, customMessage, originalError) {
    const metadata =
      ERROR_METADATA[code] || ERROR_METADATA[VoiceErrorCode.UNKNOWN_ERROR];
    super(customMessage || metadata.message);

    this.name = 'VoiceError';
    this.code = code;
    this.suggestion = metadata.suggestion;
    this.recoverable = metadata.recoverable;
    this.originalError = originalError || null;
  }

  /** @returns {{ code: string, message: string, suggestion: string, recoverable: boolean }} */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
      recoverable: this.recoverable,
    };
  }
}

/**
 * Create a VoiceError from a code and an optional error or message.
 * @param {string} code - A VoiceErrorCode value
 * @param {Error|string} [errorOrMessage]
 * @returns {VoiceError}
 */
export function createVoiceError(code, errorOrMessage) {
  if (errorOrMessage instanceof Error) {
    return new VoiceError(code, errorOrMessage.message, errorOrMessage);
  }
  return new VoiceError(code, errorOrMessage);
}

/**
 * Map getUserMedia errors to VoiceErrorCode.
 * @param {Error} error
 * @returns {string}
 */
export function getMediaErrorCode(error) {
  const name = error?.name || '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return VoiceErrorCode.MICROPHONE_PERMISSION_DENIED;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return VoiceErrorCode.MICROPHONE_NOT_FOUND;
    case 'NotSupportedError':
      return VoiceErrorCode.BROWSER_NOT_SUPPORTED;
    default:
      return VoiceErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Map WebSocket/STT connection errors to VoiceErrorCode.
 * @param {Error} error
 * @returns {string}
 */
export function getWebSocketErrorCode(error) {
  const msg = (error?.message || '').toLowerCase();

  if (
    msg.includes('401') ||
    msg.includes('unauthorized') ||
    msg.includes('token')
  ) {
    return VoiceErrorCode.TOKEN_EXPIRED;
  }
  if (msg.includes('429') || msg.includes('rate limit')) {
    return VoiceErrorCode.RATE_LIMITED;
  }
  if (msg.includes('network') || msg.includes('connection')) {
    return VoiceErrorCode.NETWORK_ERROR;
  }
  return VoiceErrorCode.STT_CONNECTION_FAILED;
}

/**
 * Map ElevenLabs API message_type to VoiceErrorCode.
 * @param {string} messageType
 * @returns {string}
 */
export function getSTTMessageErrorCode(messageType) {
  switch (messageType) {
    case 'error':
    case 'input_error':
    case 'chunk_size_exceeded':
    case 'transcriber_error':
      return VoiceErrorCode.STT_TRANSCRIPTION_FAILED;
    case 'auth_error':
      return VoiceErrorCode.TOKEN_EXPIRED;
    case 'rate_limited':
    case 'quota_exceeded':
    case 'commit_throttled':
    case 'queue_overflow':
      return VoiceErrorCode.RATE_LIMITED;
    case 'resource_exhausted':
    case 'session_time_limit_exceeded':
      return VoiceErrorCode.STT_CONNECTION_FAILED;
    case 'unaccepted_terms':
      return VoiceErrorCode.UNKNOWN_ERROR;
    default:
      return VoiceErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Map fetch/TTS errors to VoiceErrorCode.
 * @param {Error|Response} error
 * @returns {string}
 */
export function getTTSErrorCode(error) {
  if (error?.status === 401) {
    return VoiceErrorCode.TOKEN_EXPIRED;
  }
  if (error?.status === 429) {
    return VoiceErrorCode.RATE_LIMITED;
  }

  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('network') || msg.includes('fetch')) {
    return VoiceErrorCode.NETWORK_ERROR;
  }

  return VoiceErrorCode.TTS_GENERATION_FAILED;
}
