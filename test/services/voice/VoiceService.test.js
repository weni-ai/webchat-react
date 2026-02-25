import { VoiceService, VoiceSessionState } from "@/services/voice/VoiceService";
import { VoiceError, VoiceErrorCode } from "@/services/voice/errors";

// ---------------------------------------------------------------------------
// Mock all sub-components
// ---------------------------------------------------------------------------

const mockAudioCapture = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  destroy: jest.fn(),
  resetSpeakingState: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  isCapturing: false,
};

const mockSTTConnection = {
  connect: jest.fn(() => Promise.resolve()),
  sendAudio: jest.fn(),
  commit: jest.fn(),
  disconnect: jest.fn(),
  destroy: jest.fn(),
  isConnected: jest.fn(() => true),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
};

const mockTTSPlayer = {
  speak: jest.fn(() => Promise.resolve()),
  stop: jest.fn(),
  destroy: jest.fn(),
  clearPreviousText: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  isPlaying: false,
};

const mockTextChunker = {
  addText: jest.fn(() => null),
  flush: jest.fn(() => null),
  clear: jest.fn(),
};

const mockEchoGuard = {
  shouldForwardAudio: jest.fn(() => true),
  shouldTriggerBargeIn: jest.fn(() => false),
  onTTSStarted: jest.fn(),
  onTTSStopped: jest.fn(),
  onBargeInDetected: jest.fn(),
  reset: jest.fn(),
  destroy: jest.fn(),
};

jest.mock("@/services/voice/AudioCapture", () => ({
  AudioCapture: jest.fn(() => ({ ...mockAudioCapture })),
}));

jest.mock("@/services/voice/STTConnection", () => ({
  STTConnection: jest.fn(() => ({ ...mockSTTConnection })),
  __esModule: true,
  default: jest.fn(() => ({ ...mockSTTConnection })),
}));

jest.mock("@/services/voice/TTSPlayer", () => ({
  TTSPlayer: jest.fn(() => ({ ...mockTTSPlayer })),
  __esModule: true,
  default: jest.fn(() => ({ ...mockTTSPlayer })),
}));

jest.mock("@/services/voice/TextChunker", () => ({
  TextChunker: jest.fn(() => ({ ...mockTextChunker })),
  __esModule: true,
  default: jest.fn(() => ({ ...mockTextChunker })),
}));

jest.mock("@/services/voice/EchoGuard", () => ({
  EchoGuard: jest.fn(() => ({ ...mockEchoGuard })),
  __esModule: true,
  default: jest.fn(() => ({ ...mockEchoGuard })),
}));

jest.mock("@/services/voice/config", () => ({
  mergeVoiceConfig: jest.fn((cfg) => ({
    voiceId: "voice-1",
    languageCode: "en",
    ttsModel: "eleven_flash_v2_5",
    audioFormat: "mp3_44100_128",
    latencyOptimization: 3,
    vadThreshold: 0.02,
    getToken: cfg.getToken || jest.fn(() => Promise.resolve("token-abc")),
    getApiKey: cfg.getApiKey || jest.fn(() => "api-key-123"),
    ...cfg,
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { AudioCapture } = require("@/services/voice/AudioCapture");
const { STTConnection } = require("@/services/voice/STTConnection");

function createInitializedService(overrides = {}) {
  const svc = new VoiceService();
  const config = {
    voiceId: "voice-1",
    getToken: jest.fn(() => Promise.resolve("token-abc")),
    getApiKey: jest.fn(() => "api-key-123"),
    ...overrides,
  };
  svc.init(config);
  return svc;
}

function getAudioCaptureListenerFor(svc, eventName) {
  const onCalls = svc.audioCapture.on.mock.calls;
  const match = onCalls.find(([name]) => name === eventName);
  return match ? match[1] : null;
}

function getSTTListenerFor(svc, eventName) {
  const onCalls = svc.sttConnection.on.mock.calls;
  const match = onCalls.find(([name]) => name === eventName);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VoiceService", () => {
  let svc;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = null;
  });

  afterEach(() => {
    if (svc) {
      svc.removeAllListeners();
    }
  });

  // -- isSupported ----------------------------------------------------------

  describe("isSupported()", () => {
    it("returns true when all APIs present", () => {
      AudioCapture.isSupported = jest.fn(() => true);
      global.WebSocket = jest.fn();
      window.AudioContext = jest.fn();

      expect(VoiceService.isSupported()).toBe(true);

      delete global.WebSocket;
      delete window.AudioContext;
    });

    it("returns false when AudioCapture not supported", () => {
      AudioCapture.isSupported = jest.fn(() => false);
      global.WebSocket = jest.fn();
      window.AudioContext = jest.fn();

      expect(VoiceService.isSupported()).toBe(false);

      delete global.WebSocket;
      delete window.AudioContext;
    });

    it("returns false when WebSocket is missing", () => {
      AudioCapture.isSupported = jest.fn(() => true);
      const savedWs = global.WebSocket;
      delete global.WebSocket;
      window.AudioContext = jest.fn();

      expect(VoiceService.isSupported()).toBe(false);

      global.WebSocket = savedWs;
      delete window.AudioContext;
    });

    it("falls back to webkitAudioContext", () => {
      AudioCapture.isSupported = jest.fn(() => true);
      global.WebSocket = jest.fn();
      delete window.AudioContext;
      window.webkitAudioContext = jest.fn();

      expect(VoiceService.isSupported()).toBe(true);

      delete global.WebSocket;
      delete window.webkitAudioContext;
    });
  });

  // -- init -----------------------------------------------------------------

  describe("init()", () => {
    it("merges config and creates sub-components", async () => {
      svc = createInitializedService();

      expect(svc.config).toBeDefined();
      expect(svc.audioCapture).toBeDefined();
      expect(svc.ttsPlayer).toBeDefined();
      expect(svc.textChunker).toBeDefined();
      expect(svc.echoGuard).toBeDefined();
    });

    it("wires AudioCapture listeners", () => {
      svc = createInitializedService();

      const onCalls = svc.audioCapture.on.mock.calls.map(([name]) => name);
      expect(onCalls).toContain("audioData");
      expect(onCalls).toContain("voiceActivity");
    });
  });

  // -- startSession ---------------------------------------------------------

  describe("startSession()", () => {
    it("transitions IDLE→INITIALIZING→LISTENING, emits session:started", async () => {
      svc = createInitializedService();
      const stateChanges = [];
      svc.on("state:changed", (e) => stateChanges.push(e.state));
      const sessionStarted = jest.fn();
      svc.on("session:started", sessionStarted);

      const result = await svc.startSession();

      expect(stateChanges).toContain(VoiceSessionState.INITIALIZING);
      expect(stateChanges).toContain(VoiceSessionState.LISTENING);
      expect(svc.state).toBe(VoiceSessionState.LISTENING);
      expect(sessionStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          startedAt: expect.any(Number),
        }),
      );
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("startedAt");
    });

    it("starts AudioCapture and connects STT", async () => {
      svc = createInitializedService();
      await svc.startSession();

      expect(svc.audioCapture.start).toHaveBeenCalledWith(
        expect.objectContaining({ vadThreshold: 0.02 }),
      );
      expect(svc.sttConnection.connect).toHaveBeenCalled();
    });

    it("throws when not in IDLE state", async () => {
      svc = createInitializedService();
      await svc.startSession();

      await expect(svc.startSession()).rejects.toThrow();
    });

    it("transitions to ERROR on VoiceError failure", async () => {
      svc = createInitializedService();
      svc.audioCapture.start.mockRejectedValueOnce(
        new VoiceError(VoiceErrorCode.MICROPHONE_PERMISSION_DENIED),
      );

      const errorHandler = jest.fn();
      svc.on("error", errorHandler);

      await expect(svc.startSession()).rejects.toThrow();
      expect(svc.state).toBe(VoiceSessionState.ERROR);
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].code).toBe(
        VoiceErrorCode.MICROPHONE_PERMISSION_DENIED,
      );
    });

    it("wraps non-VoiceError in UNKNOWN_ERROR on failure", async () => {
      svc = createInitializedService();
      svc.audioCapture.start.mockRejectedValueOnce(new Error("generic fail"));

      const errorHandler = jest.fn();
      svc.on("error", errorHandler);

      await expect(svc.startSession()).rejects.toThrow();
      expect(svc.state).toBe(VoiceSessionState.ERROR);
      expect(errorHandler.mock.calls[0][0].code).toBe(
        VoiceErrorCode.UNKNOWN_ERROR,
      );
    });
  });

  // -- endSession -----------------------------------------------------------

  describe("endSession()", () => {
    it("stops all components and transitions to IDLE", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const ended = jest.fn();
      svc.on("session:ended", ended);

      svc.endSession();

      expect(svc.audioCapture.stop).toHaveBeenCalled();
      expect(svc.ttsPlayer.stop).toHaveBeenCalledWith(true);
      expect(svc.textChunker.clear).toHaveBeenCalled();
      expect(svc.echoGuard.reset).toHaveBeenCalled();
      expect(svc.state).toBe(VoiceSessionState.IDLE);
      expect(ended).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(String),
          duration: expect.any(Number),
        }),
      );
    });
  });

  // -- State transitions via AudioCapture events ----------------------------

  describe("state transitions", () => {
    it("voiceActivity {speaking:true} in LISTENING → PROCESSING", async () => {
      svc = createInitializedService();
      await svc.startSession();
      expect(svc.state).toBe(VoiceSessionState.LISTENING);

      const voiceHandler = getAudioCaptureListenerFor(svc, "voiceActivity");
      voiceHandler({ speaking: true });

      expect(svc.state).toBe(VoiceSessionState.PROCESSING);
    });

    it("STT committed → LISTENING, calls messageCallback", async () => {
      svc = createInitializedService();
      const msgCallback = jest.fn();
      svc.setMessageCallback(msgCallback);
      await svc.startSession();

      svc.setState(VoiceSessionState.PROCESSING);

      const committedHandler = getSTTListenerFor(svc, "committed");
      committedHandler({ text: "hello world" });

      expect(svc.state).toBe(VoiceSessionState.LISTENING);
      expect(msgCallback).toHaveBeenCalledWith("hello world");
    });

    it("voiceActivity {speaking:false} does not change state", async () => {
      svc = createInitializedService();
      await svc.startSession();
      expect(svc.state).toBe(VoiceSessionState.LISTENING);

      const voiceHandler = getAudioCaptureListenerFor(svc, "voiceActivity");
      voiceHandler({ speaking: false });

      expect(svc.state).toBe(VoiceSessionState.LISTENING);
    });

    it("voiceActivity in non-LISTENING state does not transition", async () => {
      svc = createInitializedService();
      await svc.startSession();
      svc.setState(VoiceSessionState.SPEAKING);

      const voiceHandler = getAudioCaptureListenerFor(svc, "voiceActivity");
      voiceHandler({ speaking: true });

      expect(svc.state).toBe(VoiceSessionState.SPEAKING);
    });

    it("audioData forwarding when not SPEAKING does not check bargeIn", async () => {
      svc = createInitializedService();
      await svc.startSession();
      svc.echoGuard.shouldForwardAudio.mockReturnValue(true);

      const audioHandler = getAudioCaptureListenerFor(svc, "audioData");
      audioHandler({ data: "base64", sampleRate: 16000, hasVoice: false });

      expect(svc.echoGuard.shouldTriggerBargeIn).not.toHaveBeenCalled();
      expect(svc.sttConnection.sendAudio).toHaveBeenCalled();
    });

    it("STT committed with empty text does not call messageCallback", async () => {
      svc = createInitializedService();
      const msgCallback = jest.fn();
      svc.setMessageCallback(msgCallback);
      await svc.startSession();

      const committedHandler = getSTTListenerFor(svc, "committed");
      committedHandler({ text: "   " });

      expect(msgCallback).not.toHaveBeenCalled();
    });

    it("STT partial → updates partialTranscript", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const partialHandler = getSTTListenerFor(svc, "partial");
      partialHandler({ text: "hel" });

      expect(svc.partialTranscript).toBe("hel");
    });
  });

  // -- processTextChunk → TTS pipeline -------------------------------------

  describe("processTextChunk()", () => {
    it("feeds text through TextChunker and speaks when chunk is ready", async () => {
      svc = createInitializedService();
      await svc.startSession();
      svc.textChunker.addText.mockReturnValueOnce("Hello world.");

      svc.processTextChunk("Hello world.");

      expect(svc.textChunker.addText).toHaveBeenCalledWith("Hello world.");
      expect(svc.echoGuard.onTTSStarted).toHaveBeenCalled();
      expect(svc.ttsPlayer.speak).toHaveBeenCalled();
      expect(svc.state).toBe(VoiceSessionState.SPEAKING);
    });

    it("flushes remaining text when isComplete=true", async () => {
      svc = createInitializedService();
      await svc.startSession();
      svc.textChunker.addText.mockReturnValueOnce(null);
      svc.textChunker.flush.mockReturnValueOnce("last bit");

      svc.processTextChunk("last bit", true);

      expect(svc.textChunker.flush).toHaveBeenCalled();
      expect(svc.ttsPlayer.speak).toHaveBeenCalled();
    });

    it("does nothing if textChunker is null", () => {
      svc = new VoiceService();
      expect(() => svc.processTextChunk("hi")).not.toThrow();
    });
  });

  // -- TTS ended → back to LISTENING ---------------------------------------

  describe("TTS ended transition", () => {
    it("transitions SPEAKING → LISTENING on TTS ended", async () => {
      svc = createInitializedService();
      await svc.startSession();
      svc.textChunker.addText.mockReturnValueOnce("Chunk");

      svc.processTextChunk("Chunk");
      expect(svc.state).toBe(VoiceSessionState.SPEAKING);

      const onceCalls = svc.ttsPlayer.once.mock.calls;
      const endedCallback = onceCalls.find(([ev]) => ev === "ended")?.[1];
      expect(endedCallback).toBeDefined();

      endedCallback();

      expect(svc.echoGuard.onTTSStopped).toHaveBeenCalled();
      expect(svc.state).toBe(VoiceSessionState.LISTENING);
    });
  });

  // -- Barge-in -------------------------------------------------------------

  describe("barge-in", () => {
    it("voice during SPEAKING → stops TTS, clears chunker, emits barge-in", async () => {
      svc = createInitializedService();
      await svc.startSession();
      svc.setState(VoiceSessionState.SPEAKING);

      svc.echoGuard.shouldTriggerBargeIn.mockReturnValueOnce(true);
      const bargeHandler = jest.fn();
      svc.on("barge-in", bargeHandler);

      const audioDataHandler = getAudioCaptureListenerFor(svc, "audioData");
      audioDataHandler({ data: "base64", sampleRate: 16000, hasVoice: true });

      expect(svc.ttsPlayer.stop).toHaveBeenCalledWith(false, true);
      expect(svc.textChunker.clear).toHaveBeenCalled();
      expect(svc.echoGuard.onBargeInDetected).toHaveBeenCalled();
      expect(svc.audioCapture.resetSpeakingState).toHaveBeenCalled();
      expect(bargeHandler).toHaveBeenCalled();
      expect(svc.state).toBe(VoiceSessionState.LISTENING);
    });
  });

  // -- EchoGuard integration ------------------------------------------------

  describe("EchoGuard integration", () => {
    it("shouldForwardAudio checked before sendAudio", async () => {
      svc = createInitializedService();
      await svc.startSession();

      svc.echoGuard.shouldForwardAudio.mockReturnValueOnce(false);

      const audioDataHandler = getAudioCaptureListenerFor(svc, "audioData");
      audioDataHandler({ data: "base64", sampleRate: 16000, hasVoice: false });

      expect(svc.sttConnection.sendAudio).not.toHaveBeenCalled();
    });

    it("forwards audio when echoGuard allows", async () => {
      svc = createInitializedService();
      await svc.startSession();

      svc.echoGuard.shouldForwardAudio.mockReturnValueOnce(true);

      const audioDataHandler = getAudioCaptureListenerFor(svc, "audioData");
      audioDataHandler({ data: "base64", sampleRate: 16000, hasVoice: false });

      expect(svc.sttConnection.sendAudio).toHaveBeenCalledWith(
        "base64",
        16000,
        false,
      );
    });
  });

  // -- EchoGuard TTS-gating integration ------------------------------------

  describe("EchoGuard TTS-gating", () => {
    it("blocks sendAudio while TTS is playing, resumes after cooldown", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const audioDataHandler = getAudioCaptureListenerFor(svc, "audioData");
      const payload = { data: "base64", sampleRate: 16000, hasVoice: false };

      svc.echoGuard.shouldForwardAudio.mockReturnValue(false);
      audioDataHandler(payload);
      expect(svc.sttConnection.sendAudio).not.toHaveBeenCalled();

      svc.echoGuard.shouldForwardAudio.mockReturnValue(false);
      audioDataHandler(payload);
      expect(svc.sttConnection.sendAudio).not.toHaveBeenCalled();

      svc.echoGuard.shouldForwardAudio.mockReturnValue(true);
      audioDataHandler(payload);
      expect(svc.sttConnection.sendAudio).toHaveBeenCalledTimes(1);
    });

    it("calls onTTSStarted when speaking and onTTSStopped when ended", async () => {
      svc = createInitializedService();
      await svc.startSession();

      svc.textChunker.addText.mockReturnValueOnce("Hello.");
      svc.processTextChunk("Hello.");

      expect(svc.echoGuard.onTTSStarted).toHaveBeenCalled();

      const endedCallback = svc.ttsPlayer.once.mock.calls.find(
        ([ev]) => ev === "ended",
      )?.[1];
      expect(endedCallback).toBeDefined();
      endedCallback();

      expect(svc.echoGuard.onTTSStopped).toHaveBeenCalled();
    });
  });

  // -- STT auto-reconnect ---------------------------------------------------

  describe("STT auto-reconnect on close", () => {
    it("reconnects STT when close fires and not IDLE", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const closeHandler = getSTTListenerFor(svc, "close");
      closeHandler();

      await Promise.resolve();

      expect(STTConnection).toHaveBeenCalledTimes(2);
    });

    it("does not reconnect when in IDLE state", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const closeHandler = getSTTListenerFor(svc, "close");
      expect(closeHandler).toBeDefined();

      svc.endSession();
      STTConnection.mockClear();

      closeHandler();

      await Promise.resolve();
      expect(STTConnection).not.toHaveBeenCalled();
    });
  });

  // -- setLanguage ----------------------------------------------------------

  describe("setLanguage()", () => {
    it("updates config languageCode", () => {
      svc = createInitializedService();
      svc.setLanguage("pt");
      expect(svc.config.languageCode).toBe("pt");
    });
  });

  // -- destroy --------------------------------------------------------------

  describe("destroy()", () => {
    it("calls endSession and destroys all components", async () => {
      svc = createInitializedService();
      await svc.startSession();

      svc.destroy();

      expect(svc.audioCapture).toBeNull();
      expect(svc.ttsPlayer).toBeNull();
      expect(svc.textChunker).toBeNull();
      expect(svc.echoGuard).toBeNull();
      expect(svc.config).toBeNull();
      expect(svc.state).toBe(VoiceSessionState.IDLE);
    });

    it("removes all listeners", async () => {
      svc = createInitializedService();
      const handler = jest.fn();
      svc.on("test", handler);

      svc.destroy();

      svc.emit("test", "data");
      expect(handler).not.toHaveBeenCalled();
      svc = null;
    });
  });

  // -- getSession -----------------------------------------------------------

  describe("getSession()", () => {
    it("returns null when no session", () => {
      svc = createInitializedService();
      expect(svc.getSession()).toBeNull();
    });

    it("returns session info when active", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const session = svc.getSession();
      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("state", VoiceSessionState.LISTENING);
      expect(session).toHaveProperty("startedAt");
      expect(session).toHaveProperty("config");
    });
  });

  // -- stopSpeaking ---------------------------------------------------------

  describe("stopSpeaking()", () => {
    it("stops TTS and clears chunker", async () => {
      svc = createInitializedService();
      await svc.startSession();

      svc.stopSpeaking(true);

      expect(svc.ttsPlayer.stop).toHaveBeenCalledWith(true);
      expect(svc.textChunker.clear).toHaveBeenCalled();
    });
  });

  // -- once/off event helpers -----------------------------------------------

  describe("event once()", () => {
    it("fires callback only once", () => {
      svc = createInitializedService();
      const handler = jest.fn();
      svc.once("test:event", handler);

      svc.emit("test:event", "a");
      svc.emit("test:event", "b");

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith("a");
    });
  });

  // -- STT reconnect error --------------------------------------------------

  describe("STT reconnect error", () => {
    it("emits error when reconnect fails", async () => {
      svc = createInitializedService();
      await svc.startSession();

      svc.config.getToken = jest.fn(() =>
        Promise.reject(new Error("token fail")),
      );
      const errorHandler = jest.fn();
      svc.on("error", errorHandler);

      const closeHandler = getSTTListenerFor(svc, "close");
      closeHandler();

      await new Promise((r) => setTimeout(r, 10));
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  // -- TTS speak error in _speak() ------------------------------------------

  describe("TTS speak error in _speak()", () => {
    it("emits error when ttsPlayer.speak rejects", async () => {
      svc = createInitializedService();
      await svc.startSession();

      svc.ttsPlayer.speak.mockRejectedValueOnce(new Error("tts fail"));

      const errorHandler = jest.fn();
      svc.on("error", errorHandler);

      svc.textChunker.addText.mockReturnValueOnce("Chunk");
      svc.processTextChunk("Chunk");

      await new Promise((r) => setTimeout(r, 10));

      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0][0].code).toBe(
        VoiceErrorCode.TTS_GENERATION_FAILED,
      );
    });
  });

  // -- STT error handling ---------------------------------------------------

  describe("STT error handling", () => {
    it("emits VoiceError from STT error events directly", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const errorHandler = jest.fn();
      svc.on("error", errorHandler);

      const sttErrorHandler = getSTTListenerFor(svc, "error");
      const voiceErr = new VoiceError(VoiceErrorCode.STT_TRANSCRIPTION_FAILED);
      sttErrorHandler(voiceErr);

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].code).toBe(
        VoiceErrorCode.STT_TRANSCRIPTION_FAILED,
      );
    });

    it("wraps non-VoiceError from STT into STT_TRANSCRIPTION_FAILED", async () => {
      svc = createInitializedService();
      await svc.startSession();

      const errorHandler = jest.fn();
      svc.on("error", errorHandler);

      const sttErrorHandler = getSTTListenerFor(svc, "error");
      sttErrorHandler(new Error("generic"));

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0][0].code).toBe(
        VoiceErrorCode.STT_TRANSCRIPTION_FAILED,
      );
    });
  });
});
