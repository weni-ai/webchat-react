import { useChatContext } from '@/contexts/ChatContext';
import { useMemo, useCallback } from 'react';

export function useVoiceMode() {
  const context = useChatContext();
  const {
    isVoiceModeActive,
    isVoiceModeSupported,
    voiceModeState,
    voicePartialTranscript,
    voiceCommittedTranscript,
    voiceAgentText,
    voiceError,
    enterVoiceMode,
    exitVoiceMode,
    retryVoiceMode,
    config,
  } = context;

  const isEnabled = useMemo(
    () => !!(config?.voiceMode?.enabled && config?.voiceMode?.voiceId),
    [config],
  );

  const isListening = useMemo(
    () => voiceModeState === 'listening' || voiceModeState === 'processing',
    [voiceModeState],
  );

  const isSpeaking = useMemo(
    () => voiceModeState === 'speaking',
    [voiceModeState],
  );

  const enter = useCallback(async () => {
    if (!isEnabled || !isVoiceModeSupported) return false;
    try {
      await enterVoiceMode();
      return true;
    } catch {
      return false;
    }
  }, [isEnabled, isVoiceModeSupported, enterVoiceMode]);

  const exit = useCallback(() => exitVoiceMode(), [exitVoiceMode]);

  const retry = useCallback(async () => {
    try {
      await retryVoiceMode();
      return true;
    } catch {
      return false;
    }
  }, [retryVoiceMode]);

  const texts = useMemo(() => config?.voiceMode?.texts || {}, [config]);

  return {
    isActive: isVoiceModeActive,
    isEnabled,
    isSupported: isVoiceModeSupported,
    state: voiceModeState,
    partialTranscript: voicePartialTranscript || '',
    committedTranscript: voiceCommittedTranscript || '',
    agentText: voiceAgentText || '',
    error: voiceError,
    isListening,
    isSpeaking,
    enter,
    exit,
    retry,
    texts,
  };
}

export default useVoiceMode;
