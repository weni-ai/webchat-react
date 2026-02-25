import TTSPlayer from "@/services/voice/TTSPlayer";
import { VoiceError, VoiceErrorCode } from "@/services/voice/errors";

// ---------------------------------------------------------------------------
// Mock config helpers
// ---------------------------------------------------------------------------

jest.mock("@/services/voice/config", () => ({
  buildTTSStreamURL: jest.fn(
    (voiceId, opts) =>
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${opts.audioFormat}&optimize_streaming_latency=${opts.latencyOptimization}`,
  ),
  buildTTSRequestBody: jest.fn((text, opts, prevText) => {
    const body = { text, model_id: opts.ttsModel };
    if (opts.languageCode) body.language_code = opts.languageCode;
    if (prevText) body.previous_text = prevText;
    return body;
  }),
}));

jest.mock("@/utils/audioUtils", () => ({
  mergeAudioChunks: jest.fn(() => new ArrayBuffer(8)),
}));

// ---------------------------------------------------------------------------
// Browser API mocks
// ---------------------------------------------------------------------------

const createMockBufferSource = () => {
  const source = {
    buffer: null,
    onended: null,
    connect: jest.fn(),
    start: jest.fn(() => {
      Promise.resolve().then(() => {
        if (source.onended) source.onended();
      });
    }),
    stop: jest.fn(),
  };
  return source;
};

const createMockGainNode = () => ({
  gain: {
    value: 1,
    setValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
    cancelScheduledValues: jest.fn(),
  },
  connect: jest.fn(),
});

const createMockAudioContext = () => ({
  currentTime: 0,
  destination: {},
  createBufferSource: jest.fn(() => createMockBufferSource()),
  createGain: jest.fn(() => createMockGainNode()),
  decodeAudioData: jest.fn(() => Promise.resolve({ duration: 1.0 })),
  close: jest.fn(),
});

function installAudioContext() {
  const ctx = createMockAudioContext();
  window.AudioContext = jest.fn(() => ctx);
  window.webkitAudioContext = undefined;
  return ctx;
}

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

function createReadableStream(chunks = [new Uint8Array([1, 2, 3])]) {
  let idx = 0;
  return {
    getReader: () => ({
      read: jest.fn(() => {
        if (idx < chunks.length) {
          const value = chunks[idx++];
          return Promise.resolve({ done: false, value });
        }
        return Promise.resolve({ done: true });
      }),
      releaseLock: jest.fn(),
    }),
  };
}

function mockFetchOk() {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      body: createReadableStream(),
    }),
  );
}

function mockFetchError(status = 500) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ detail: { message: "Server error" } }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Test options
// ---------------------------------------------------------------------------

const ttsOptions = {
  voiceId: "voice-1",
  apiKey: "key-123",
  ttsModel: "eleven_flash_v2_5",
  audioFormat: "mp3_44100_128",
  languageCode: "en",
  latencyOptimization: 3,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TTSPlayer", () => {
  let player;
  let mockCtx;

  beforeEach(() => {
    mockCtx = installAudioContext();
    mockFetchOk();
    player = new TTSPlayer();
  });

  afterEach(() => {
    player.destroy();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  // -- speak ----------------------------------------------------------------

  describe("speak()", () => {
    it("makes fetch with correct URL, headers, and body", async () => {
      await player.speak("Hello", ttsOptions);

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toContain("voice-1");
      expect(url).toContain("output_format=mp3_44100_128");
      expect(url).toContain("optimize_streaming_latency=3");

      expect(init.method).toBe("POST");
      expect(init.headers["xi-api-key"]).toBe("key-123");
      expect(init.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(init.body);
      expect(body.text).toBe("Hello");
      expect(body.model_id).toBe("eleven_flash_v2_5");
      expect(body.language_code).toBe("en");
    });

    it("decodes audio and plays via BufferSource", async () => {
      await player.speak("Hi", ttsOptions);

      expect(mockCtx.decodeAudioData).toHaveBeenCalled();
      const source = mockCtx.createBufferSource.mock.results[0].value;
      expect(source.start).toHaveBeenCalledWith(0);
      expect(source.connect).toHaveBeenCalled();
    });

    it("tracks previousText for subsequent calls", async () => {
      const { buildTTSRequestBody } = require("@/services/voice/config");

      await player.speak("First", ttsOptions);
      expect(player.previousText).toBe("First");

      await player.speak("Second", ttsOptions);

      const lastCall =
        buildTTSRequestBody.mock.calls[
          buildTTSRequestBody.mock.calls.length - 1
        ];
      expect(lastCall[2]).toBe("First");
      expect(player.previousText).toBe("Second");
    });

    it("emits started and ended events", async () => {
      const started = jest.fn();
      const ended = jest.fn();
      player.on("started", started);
      player.on("ended", ended);

      await player.speak("Text", ttsOptions);

      expect(started).toHaveBeenCalledWith({ text: "Text" });
      expect(ended).toHaveBeenCalled();
    });
  });

  // -- Queue ----------------------------------------------------------------

  describe("queue", () => {
    it("processes multiple speak() calls sequentially", async () => {
      const order = [];
      player.on("started", ({ text }) => order.push(text));

      const p1 = player.speak("One", ttsOptions);
      const p2 = player.speak("Two", ttsOptions);

      await p1;
      await p2;

      expect(order).toEqual(["One", "Two"]);
    });
  });

  // -- stop -----------------------------------------------------------------

  describe("stop()", () => {
    it("stop(immediate=true) stops source immediately", () => {
      player._initAudioContext();
      const mockSource = { stop: jest.fn() };
      player._currentSource = mockSource;
      player.isPlaying = true;

      player.stop(true);

      expect(mockSource.stop).toHaveBeenCalled();
      expect(player.isPlaying).toBe(false);
    });

    it("stop(bargeIn=true) uses fast fade and clears previousText", () => {
      player._initAudioContext();
      player.previousText = "Text";
      player._currentSource = { stop: jest.fn() };
      player.isPlaying = true;

      player.stop(false, true);

      const gain = mockCtx.createGain.mock.results[0].value;
      expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
      const fadeArgs = gain.gain.exponentialRampToValueAtTime.mock.calls[0];
      expect(fadeArgs[0]).toBeCloseTo(0.001);
      expect(player.previousText).toBe("");
    });

    it("stop() with neither flag uses 150ms fade", () => {
      player._initAudioContext();
      player._currentSource = { stop: jest.fn() };
      player.isPlaying = true;

      player.stop(false, false);

      const gain = mockCtx.createGain.mock.results[0].value;
      expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
      const fadeArgs = gain.gain.exponentialRampToValueAtTime.mock.calls[0];
      expect(fadeArgs[1]).toBeCloseTo(0.15, 1);
    });
  });

  // -- clearPreviousText ----------------------------------------------------

  describe("clearPreviousText()", () => {
    it("resets previousText to empty string", async () => {
      await player.speak("Text", ttsOptions);
      expect(player.previousText).toBe("Text");
      player.clearPreviousText();
      expect(player.previousText).toBe("");
    });
  });

  // -- Error handling -------------------------------------------------------

  describe("error handling", () => {
    it("throws VoiceError on fetch failure", async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error("network fail")));

      await expect(player.speak("Text", ttsOptions)).rejects.toThrow();
    });

    it("ignores AbortError", async () => {
      const abortErr = new Error("aborted");
      abortErr.name = "AbortError";
      global.fetch = jest.fn(() => Promise.reject(abortErr));
      const errorHandler = jest.fn();
      player.on("error", errorHandler);

      await player.speak("Text", ttsOptions);

      expect(errorHandler).not.toHaveBeenCalled();
    });

    it("throws VoiceError on non-ok response", async () => {
      mockFetchError(500);

      await expect(player.speak("Text", ttsOptions)).rejects.toMatchObject({
        code: VoiceErrorCode.TTS_GENERATION_FAILED,
      });
    });

    it("maps 401 response to TOKEN_EXPIRED", async () => {
      mockFetchError(401);

      await expect(player.speak("Text", ttsOptions)).rejects.toMatchObject({
        code: VoiceErrorCode.TOKEN_EXPIRED,
      });
    });
  });

  // -- destroy --------------------------------------------------------------

  describe("destroy()", () => {
    it("stops playback and closes AudioContext", async () => {
      await player.speak("Text", ttsOptions);

      player.destroy();

      expect(mockCtx.close).toHaveBeenCalled();
    });

    it("removes all listeners", () => {
      const handler = jest.fn();
      player.on("started", handler);
      player.destroy();

      player.emit("started", { text: "x" });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // -- Edge cases for coverage -----------------------------------------------

  describe("edge cases", () => {
    it("_playBuffer resolves immediately when isStopped", async () => {
      player._initAudioContext();
      player.isStopped = true;
      await player._playBuffer({ duration: 1.0 });
    });

    it("_fadeAndStop falls back to _stopSource when no gainNode", () => {
      player._currentSource = { stop: jest.fn() };
      player._gainNode = null;
      player._audioContext = null;

      player._fadeAndStop(0.15);

      expect(player._currentSource).toBeNull();
    });

    it("stop rejects pending queue entries", () => {
      player._ttsQueue = [
        { text: "A", options: {}, resolve: jest.fn(), reject: jest.fn() },
        { text: "B", options: {}, resolve: jest.fn(), reject: jest.fn() },
      ];
      const rejectA = player._ttsQueue[0].reject;
      const rejectB = player._ttsQueue[1].reject;

      player.stop(true);

      expect(rejectA).toHaveBeenCalled();
      expect(rejectB).toHaveBeenCalled();
      expect(player._ttsQueue).toEqual([]);
    });

    it("_speakImmediate handles isStopped during streaming", async () => {
      await player.speak("First", ttsOptions);

      player.isStopped = false;
      player._isProcessingTTS = false;

      mockCtx.decodeAudioData.mockImplementationOnce(async () => {
        player.isStopped = true;
        return { duration: 1.0 };
      });

      await player.speak("Second", ttsOptions);
    });

    it("handles error in response body JSON parsing", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.reject(new Error("bad json")),
        }),
      );

      await expect(player.speak("Text", ttsOptions)).rejects.toMatchObject({
        code: VoiceErrorCode.TTS_GENERATION_FAILED,
      });
    });
  });

  // -- Event emitter --------------------------------------------------------

  describe("event emitter", () => {
    it("on/off work correctly", () => {
      const handler = jest.fn();
      player.on("test", handler);
      player.emit("test", "data");
      expect(handler).toHaveBeenCalledWith("data");

      player.off("test", handler);
      player.emit("test", "data2");
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("listener errors do not propagate", () => {
      const bad = jest.fn(() => {
        throw new Error("boom");
      });
      player.on("test", bad);
      expect(() => player.emit("test")).not.toThrow();
    });

    it("removeAllListeners clears all", () => {
      const handler = jest.fn();
      player.on("a", handler);
      player.on("b", handler);
      player.removeAllListeners();
      player.emit("a");
      player.emit("b");
      expect(handler).not.toHaveBeenCalled();
    });

    it("removeAllListeners(event) clears only that event", () => {
      const h1 = jest.fn();
      const h2 = jest.fn();
      player.on("a", h1);
      player.on("b", h2);
      player.removeAllListeners("a");
      player.emit("a");
      player.emit("b");
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });
  });
});
