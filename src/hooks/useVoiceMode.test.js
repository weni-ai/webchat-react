import fs from 'fs';
import path from 'path';
import { renderHook, act } from '@testing-library/react';
import { useVoiceMode } from '@/hooks/useVoiceMode';
import { useChatContext } from '@/contexts/ChatContext';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

function buildContext(overrides = {}) {
  return {
    isVoiceEnabledByServer: true,
    isVoiceModeActive: false,
    isVoiceModeSupported: true,
    voiceModeState: 'idle',
    voicePartialTranscript: '',
    voiceError: null,
    enterVoiceMode: jest.fn().mockResolvedValue(undefined),
    exitVoiceMode: jest.fn(),
    retryVoiceMode: jest.fn().mockResolvedValue(undefined),
    config: { voiceMode: { texts: { title: 'Talk' } } },
    ...overrides,
  };
}

describe('useVoiceMode', () => {
  beforeEach(() => {
    useChatContext.mockReturnValue(buildContext());
  });

  it('does not import the local voice pipeline', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, './useVoiceMode.js'),
      'utf8',
    );
    expect(source).not.toMatch(/@\/services\/voice/);
  });

  it('maps listening and speaking from voice:state held on context', () => {
    useChatContext.mockReturnValue(
      buildContext({ voiceModeState: 'listening' }),
    );
    const listening = renderHook(() => useVoiceMode());
    expect(listening.result.current.isListening).toBe(true);
    expect(listening.result.current.isSpeaking).toBe(false);

    useChatContext.mockReturnValue(
      buildContext({ voiceModeState: 'speaking' }),
    );
    const speaking = renderHook(() => useVoiceMode());
    expect(speaking.result.current.isSpeaking).toBe(true);
  });

  it('surfaces a permission error', () => {
    useChatContext.mockReturnValue(
      buildContext({ voiceError: { operation: 'permission' } }),
    );
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.error).toEqual({ operation: 'permission' });
  });

  it('enters through the context session', async () => {
    const enterVoiceMode = jest.fn().mockResolvedValue(undefined);
    useChatContext.mockReturnValue(buildContext({ enterVoiceMode }));
    const { result } = renderHook(() => useVoiceMode());
    await act(async () => {
      await result.current.enter();
    });
    expect(enterVoiceMode).toHaveBeenCalledTimes(1);
  });
});
