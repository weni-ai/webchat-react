import PropTypes from "prop-types";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/common/Button";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { VoiceModeError } from "./VoiceModeError";
import "./VoiceModeOverlay.scss";

function getWaveformState(voiceState) {
  switch (voiceState) {
    case "listening":
    case "listening_active":
      return "listening";
    case "speaking":
      return "speaking";
    case "processing":
    case "thinking":
      return "processing";
    default:
      return "idle";
  }
}

function getStatusText(state, texts, t) {
  switch (state) {
    case "listening":
    case "listening_active":
      return {
        main: texts?.listening || t("voice_mode.listening"),
        hint: texts?.microphoneHint || t("voice_mode.microphoneHint"),
      };
    case "speaking":
      return {
        main: texts?.speaking || t("voice_mode.speaking"),
        hint: "",
      };
    case "processing":
    case "thinking":
      return {
        main: texts?.processing || t("voice_mode.processing"),
        hint: "",
      };
    default:
      return {
        main: texts?.listening || t("voice_mode.listening"),
        hint: texts?.microphoneHint || t("voice_mode.microphoneHint"),
      };
  }
}

export function VoiceModeOverlay({
  isOpen,
  state = "idle",
  partialTranscript = "",
  committedTranscript = "",
  agentText = "",
  error = null,
  onClose,
  onRetry,
  texts = {},
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const waveformState = getWaveformState(state);
  const statusText = getStatusText(state, texts, t);
  const title = texts?.title || t("voice_mode.title");

  return (
    <div
      className="weni-voice-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="weni-voice-overlay__header">
        <span className="weni-voice-overlay__title">{title}</span>
        <Button
          variant="tertiary"
          icon="close"
          iconColor="white"
          size="small"
          onClick={onClose}
          className="weni-voice-overlay__close-btn"
          aria-label="Close voice mode"
        />
      </header>

      <div className="weni-voice-overlay__content">
        {error ? (
          <VoiceModeError
            error={error}
            onRetry={onRetry}
            onDismiss={onClose}
            texts={texts}
          />
        ) : (
          <>
            <div className="weni-voice-overlay__center">
              <WaveformVisualizer state={waveformState} />
              <h1 className="weni-voice-overlay__main-text">
                {statusText.main}
              </h1>
              {statusText.hint && (
                <p className="weni-voice-overlay__hint-text">
                  {statusText.hint}
                </p>
              )}
            </div>

            <div className="weni-voice-overlay__conversation">
              {partialTranscript && (
                <div className="weni-voice-overlay__transcript weni-voice-overlay__transcript--partial">
                  <span className="weni-voice-overlay__transcript-label">
                    {texts?.you || t("voice_mode.you")}
                  </span>
                  <p className="weni-voice-overlay__transcript-text">
                    {partialTranscript}
                  </p>
                </div>
              )}

              {committedTranscript && (
                <div className="weni-voice-overlay__transcript weni-voice-overlay__transcript--committed">
                  <span className="weni-voice-overlay__transcript-label">
                    {texts?.youSaid || t("voice_mode.youSaid")}
                  </span>
                  <p className="weni-voice-overlay__transcript-text">
                    {committedTranscript}
                  </p>
                </div>
              )}

              {agentText && (
                <div className="weni-voice-overlay__transcript weni-voice-overlay__transcript--agent">
                  <span className="weni-voice-overlay__transcript-label">
                    {texts?.assistant || t("voice_mode.assistant")}
                  </span>
                  <p className="weni-voice-overlay__transcript-text">
                    {agentText}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

VoiceModeOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  state: PropTypes.string,
  partialTranscript: PropTypes.string,
  committedTranscript: PropTypes.string,
  agentText: PropTypes.string,
  error: PropTypes.shape({
    code: PropTypes.string,
    message: PropTypes.string,
    suggestion: PropTypes.string,
    recoverable: PropTypes.bool,
  }),
  onClose: PropTypes.func.isRequired,
  onRetry: PropTypes.func,
  texts: PropTypes.object,
};

export default VoiceModeOverlay;
