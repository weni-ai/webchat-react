import { renderHook, act } from "@testing-library/react";
import { useVoiceMode } from "@/hooks/useVoiceMode";

const mockEnterVoiceMode = jest.fn();
const mockExitVoiceMode = jest.fn();
const mockRetryVoiceMode = jest.fn();

let mockContextValue = {};

jest.mock("@/contexts/ChatContext", () => ({
  useChatContext: () => mockContextValue,
}));

function buildContext(overrides = {}) {
  return {
    isVoiceModeActive: false,
    isVoiceModeSupported: true,
    voiceModeState: "idle",
    voicePartialTranscript: "",
    voiceCommittedTranscript: "",
    voiceAgentText: "",
    voiceError: null,
    enterVoiceMode: mockEnterVoiceMode,
    exitVoiceMode: mockExitVoiceMode,
    retryVoiceMode: mockRetryVoiceMode,
    config: {
      voiceMode: {
        enabled: true,
        voiceId: "voice-123",
        texts: { title: "Talk" },
      },
    },
    ...overrides,
  };
}

describe("useVoiceMode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = buildContext();
  });

  it("returns isEnabled=true when config has voiceMode.enabled + voiceId", () => {
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isEnabled).toBe(true);
  });

  it("returns isEnabled=false when voiceMode is not configured", () => {
    mockContextValue = buildContext({ config: {} });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isEnabled).toBe(false);
  });

  it("returns isEnabled=false when voiceMode.enabled is false", () => {
    mockContextValue = buildContext({
      config: { voiceMode: { enabled: false, voiceId: "v1" } },
    });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isEnabled).toBe(false);
  });

  it("returns isEnabled=false when voiceId is missing", () => {
    mockContextValue = buildContext({
      config: { voiceMode: { enabled: true } },
    });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isEnabled).toBe(false);
  });

  it("returns isSupported from context", () => {
    mockContextValue = buildContext({ isVoiceModeSupported: false });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isSupported).toBe(false);
  });

  it('isListening is true when state is "listening"', () => {
    mockContextValue = buildContext({ voiceModeState: "listening" });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isListening).toBe(true);
  });

  it('isListening is true when state is "processing"', () => {
    mockContextValue = buildContext({ voiceModeState: "processing" });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isListening).toBe(true);
  });

  it('isListening is false when state is "speaking"', () => {
    mockContextValue = buildContext({ voiceModeState: "speaking" });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isListening).toBe(false);
  });

  it('isSpeaking is true when state is "speaking"', () => {
    mockContextValue = buildContext({ voiceModeState: "speaking" });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isSpeaking).toBe(true);
  });

  it('isSpeaking is false when state is "listening"', () => {
    mockContextValue = buildContext({ voiceModeState: "listening" });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.isSpeaking).toBe(false);
  });

  it("enter() returns false when not enabled", async () => {
    mockContextValue = buildContext({ config: {} });
    const { result } = renderHook(() => useVoiceMode());

    let value;
    await act(async () => {
      value = await result.current.enter();
    });

    expect(value).toBe(false);
    expect(mockEnterVoiceMode).not.toHaveBeenCalled();
  });

  it("enter() returns false when not supported", async () => {
    mockContextValue = buildContext({ isVoiceModeSupported: false });
    const { result } = renderHook(() => useVoiceMode());

    let value;
    await act(async () => {
      value = await result.current.enter();
    });

    expect(value).toBe(false);
    expect(mockEnterVoiceMode).not.toHaveBeenCalled();
  });

  it("enter() calls enterVoiceMode and returns true on success", async () => {
    mockEnterVoiceMode.mockResolvedValueOnce();
    const { result } = renderHook(() => useVoiceMode());

    let value;
    await act(async () => {
      value = await result.current.enter();
    });

    expect(value).toBe(true);
    expect(mockEnterVoiceMode).toHaveBeenCalledTimes(1);
  });

  it("enter() returns false when enterVoiceMode throws", async () => {
    mockEnterVoiceMode.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => useVoiceMode());

    let value;
    await act(async () => {
      value = await result.current.enter();
    });

    expect(value).toBe(false);
  });

  it("exit() calls exitVoiceMode", () => {
    const { result } = renderHook(() => useVoiceMode());
    act(() => {
      result.current.exit();
    });
    expect(mockExitVoiceMode).toHaveBeenCalledTimes(1);
  });

  it("retry() calls retryVoiceMode and returns true on success", async () => {
    mockRetryVoiceMode.mockResolvedValueOnce();
    const { result } = renderHook(() => useVoiceMode());

    let value;
    await act(async () => {
      value = await result.current.retry();
    });

    expect(value).toBe(true);
    expect(mockRetryVoiceMode).toHaveBeenCalledTimes(1);
  });

  it("retry() returns false when retryVoiceMode throws", async () => {
    mockRetryVoiceMode.mockRejectedValueOnce(new Error("fail"));
    const { result } = renderHook(() => useVoiceMode());

    let value;
    await act(async () => {
      value = await result.current.retry();
    });

    expect(value).toBe(false);
  });

  it("exposes texts from config", () => {
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.texts).toEqual({ title: "Talk" });
  });

  it("returns empty texts when config has no voiceMode texts", () => {
    mockContextValue = buildContext({
      config: { voiceMode: { enabled: true, voiceId: "v1" } },
    });
    const { result } = renderHook(() => useVoiceMode());
    expect(result.current.texts).toEqual({});
  });
});
