import {
  DEFAULT_VOICE_CONFIG,
  validateVoiceConfig,
  mergeVoiceConfig,
  buildSTTWebSocketURL,
  buildTTSStreamURL,
  buildTTSRequestBody,
} from "../../../src/services/voice/config";
import { VoiceError } from "../../../src/services/voice/errors";

const validConfig = {
  voiceId: "test-voice-id",
  getToken: jest.fn(),
  getApiKey: jest.fn(),
  languageCode: "en",
  ttsModel: "eleven_flash_v2_5",
  audioFormat: "mp3_44100_128",
  silenceThreshold: 1.5,
  vadThreshold: 0.02,
  latencyOptimization: 3,
};

describe("voice/config", () => {
  describe("DEFAULT_VOICE_CONFIG", () => {
    it("has correct default languageCode", () => {
      expect(DEFAULT_VOICE_CONFIG.languageCode).toBe("en");
    });

    it("has correct default ttsModel", () => {
      expect(DEFAULT_VOICE_CONFIG.ttsModel).toBe("eleven_flash_v2_5");
    });

    it("has correct default silenceThreshold", () => {
      expect(DEFAULT_VOICE_CONFIG.silenceThreshold).toBe(1.5);
    });

    it("has correct default sttModel", () => {
      expect(DEFAULT_VOICE_CONFIG.sttModel).toBe("scribe_v2_realtime");
    });

    it("has correct default sampleRate", () => {
      expect(DEFAULT_VOICE_CONFIG.sampleRate).toBe(16000);
    });

    it("has null getToken and getApiKey", () => {
      expect(DEFAULT_VOICE_CONFIG.getToken).toBeNull();
      expect(DEFAULT_VOICE_CONFIG.getApiKey).toBeNull();
    });

    it("has texts object with expected keys", () => {
      expect(DEFAULT_VOICE_CONFIG.texts).toEqual({
        title: "",
        listening: "",
        microphoneHint: "",
        speaking: "",
        processing: "",
        errorTitle: "",
      });
    });
  });

  describe("validateVoiceConfig", () => {
    it("passes for valid config", () => {
      const { valid, errors } = validateVoiceConfig(validConfig);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it("fails when voiceId is missing", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        voiceId: "",
      });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "voiceId is required and must be a non-empty string",
      );
    });

    it("fails when getToken is not a function", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        getToken: null,
      });
      expect(valid).toBe(false);
      expect(errors).toContain("getToken must be a function");
    });

    it("fails when getApiKey is not a function", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        getApiKey: "not-fn",
      });
      expect(valid).toBe(false);
      expect(errors).toContain("getApiKey must be a function");
    });

    it("fails when silenceThreshold is out of range (too low)", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        silenceThreshold: 0.1,
      });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "silenceThreshold must be a number between 0.3 and 3.0",
      );
    });

    it("fails when silenceThreshold is out of range (too high)", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        silenceThreshold: 5,
      });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "silenceThreshold must be a number between 0.3 and 3.0",
      );
    });

    it("fails when vadThreshold is out of range", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        vadThreshold: 0.001,
      });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "vadThreshold must be a number between 0.01 and 0.5",
      );
    });

    it("fails when latencyOptimization is out of range", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        latencyOptimization: 5,
      });
      expect(valid).toBe(false);
      expect(errors).toContain(
        "latencyOptimization must be an integer between 0 and 4",
      );
    });

    it("fails when ttsModel is invalid", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        ttsModel: "bad_model",
      });
      expect(valid).toBe(false);
      expect(errors[0]).toMatch(/ttsModel must be one of/);
    });

    it("fails when audioFormat is invalid", () => {
      const { valid, errors } = validateVoiceConfig({
        ...validConfig,
        audioFormat: "wav_8000",
      });
      expect(valid).toBe(false);
      expect(errors[0]).toMatch(/audioFormat must be one of/);
    });

    it("collects multiple errors at once", () => {
      const { valid, errors } = validateVoiceConfig({
        voiceId: "",
        getToken: null,
        getApiKey: null,
        silenceThreshold: 99,
        vadThreshold: 99,
        latencyOptimization: 99,
        ttsModel: "bad",
        audioFormat: "bad",
      });
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("mergeVoiceConfig", () => {
    it("merges user config with defaults", () => {
      const merged = mergeVoiceConfig({
        voiceId: "v1",
        getToken: jest.fn(),
        getApiKey: jest.fn(),
      });
      expect(merged.voiceId).toBe("v1");
      expect(merged.languageCode).toBe("en");
      expect(merged.ttsModel).toBe("eleven_flash_v2_5");
      expect(merged.silenceThreshold).toBe(1.5);
    });

    it("deep-merges texts", () => {
      const merged = mergeVoiceConfig({
        voiceId: "v1",
        getToken: jest.fn(),
        getApiKey: jest.fn(),
        texts: { title: "Voice" },
      });
      expect(merged.texts.title).toBe("Voice");
      expect(merged.texts.listening).toBe("");
    });

    it("throws VoiceError on invalid config", () => {
      expect(() => mergeVoiceConfig({})).toThrow(VoiceError);
    });

    it("includes validation errors in thrown message", () => {
      try {
        mergeVoiceConfig({});
        fail("should have thrown");
      } catch (err) {
        expect(err.message).toMatch(/Invalid voice configuration/);
        expect(err.message).toMatch(/voiceId/);
      }
    });
  });

  describe("buildSTTWebSocketURL", () => {
    const config = {
      sttModel: "scribe_v2_realtime",
      silenceThreshold: 1.5,
      sttVadThreshold: 0.4,
      minSpeechDuration: 100,
      minSilenceDuration: 100,
      languageCode: "en",
    };

    it("has correct base URL", () => {
      const url = buildSTTWebSocketURL(config, "tok123");
      expect(
        url.startsWith("wss://api.elevenlabs.io/v1/speech-to-text/realtime?"),
      ).toBe(true);
    });

    it("includes token in query params", () => {
      const url = buildSTTWebSocketURL(config, "tok123");
      const params = new URL(url).searchParams;
      expect(params.get("token")).toBe("tok123");
    });

    it("includes audio_format=pcm_16000", () => {
      const url = buildSTTWebSocketURL(config, "tok123");
      const params = new URL(url).searchParams;
      expect(params.get("audio_format")).toBe("pcm_16000");
    });

    it("includes vad_silence_threshold_secs in seconds", () => {
      const url = buildSTTWebSocketURL(config, "tok123");
      const params = new URL(url).searchParams;
      expect(params.get("vad_silence_threshold_secs")).toBe("1.5");
    });

    it("includes min_speech_duration_ms without vad_ prefix", () => {
      const url = buildSTTWebSocketURL(config, "tok123");
      const params = new URL(url).searchParams;
      expect(params.get("min_speech_duration_ms")).toBe("100");
      expect(params.has("vad_min_speech_duration_ms")).toBe(false);
    });

    it("does not include vad_prefix_padding_ms", () => {
      const url = buildSTTWebSocketURL(config, "tok123");
      const params = new URL(url).searchParams;
      expect(params.has("vad_prefix_padding_ms")).toBe(false);
    });

    it("includes language_code when present", () => {
      const url = buildSTTWebSocketURL(config, "tok123");
      const params = new URL(url).searchParams;
      expect(params.get("language_code")).toBe("en");
    });

    it("omits language_code when empty", () => {
      const url = buildSTTWebSocketURL(
        { ...config, languageCode: "" },
        "tok123",
      );
      const params = new URL(url).searchParams;
      expect(params.has("language_code")).toBe(false);
    });
  });

  describe("buildTTSStreamURL", () => {
    const config = {
      audioFormat: "mp3_44100_128",
      latencyOptimization: 3,
    };

    it("includes voiceId in path", () => {
      const url = buildTTSStreamURL("v123", config);
      expect(url).toContain("/text-to-speech/v123/stream");
    });

    it("includes output_format query param", () => {
      const url = buildTTSStreamURL("v123", config);
      const params = new URL(url).searchParams;
      expect(params.get("output_format")).toBe("mp3_44100_128");
    });

    it("includes optimize_streaming_latency query param", () => {
      const url = buildTTSStreamURL("v123", config);
      const params = new URL(url).searchParams;
      expect(params.get("optimize_streaming_latency")).toBe("3");
    });
  });

  describe("buildTTSRequestBody", () => {
    const config = {
      ttsModel: "eleven_flash_v2_5",
      languageCode: "en",
      audioFormat: "mp3_44100_128",
    };

    it("includes text in body", () => {
      const body = buildTTSRequestBody("Hello", config);
      expect(body.text).toBe("Hello");
    });

    it("includes model_id in body", () => {
      const body = buildTTSRequestBody("Hello", config);
      expect(body.model_id).toBe("eleven_flash_v2_5");
    });

    it("includes language_code in body", () => {
      const body = buildTTSRequestBody("Hello", config);
      expect(body.language_code).toBe("en");
    });

    it("does not include output_format in body", () => {
      const body = buildTTSRequestBody("Hello", config);
      expect(body.output_format).toBeUndefined();
    });

    it("includes previous_text when provided", () => {
      const body = buildTTSRequestBody("world", config, "Hello");
      expect(body.previous_text).toBe("Hello");
    });

    it("omits previous_text when not provided", () => {
      const body = buildTTSRequestBody("Hello", config);
      expect(body.previous_text).toBeUndefined();
    });

    it("omits language_code when empty", () => {
      const body = buildTTSRequestBody("Hello", {
        ...config,
        languageCode: "",
      });
      expect(body.language_code).toBeUndefined();
    });
  });
});
