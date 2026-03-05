import PropTypes from "prop-types";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/common/Button";
import "./VoiceModeButton.scss";

function getAnimationState(voiceState) {
  switch (voiceState) {
    case "speaking":
      return "speaking";
    case "processing":
    case "thinking":
      return "processing";
    case "listening":
    case "listening_active":
    default:
      return "listening";
  }
}

export function VoiceModeButton({
  onClick,
  disabled = false,
  isActive = false,
  voiceState = "idle",
  className = "",
}) {
  const { t } = useTranslation();

  const bars = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          className="weni-voice-mode-btn__bar"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      )),
    [],
  );

  if (isActive) {
    const animState = getAnimationState(voiceState);

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`weni-voice-mode-btn weni-voice-mode-btn--active ${className}`}
        aria-label={t("voice_mode.stop")}
      >
        <div
          className={`weni-voice-mode-btn__bars weni-voice-mode-btn__bars--${animState}`}
        >
          {bars}
        </div>
        <span className="weni-voice-mode-btn__label">
          {t("voice_mode.stop")}
        </span>
      </button>
    );
  }

  return (
    <Button
      variant="tertiary"
      icon="graphic_eq"
      iconColor="gray-900"
      onClick={onClick}
      disabled={disabled}
      className={`weni-voice-mode-btn ${className}`}
      aria-label="Enter voice mode"
    />
  );
}

VoiceModeButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isActive: PropTypes.bool,
  voiceState: PropTypes.string,
  className: PropTypes.string,
};

export default VoiceModeButton;
