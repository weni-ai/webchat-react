import PropTypes from "prop-types";
import { useMemo } from "react";
import "./WaveformVisualizer.scss";

function getAriaLabel(state) {
  switch (state) {
    case "listening":
      return "Listening for your voice";
    case "speaking":
      return "Playing audio response";
    case "processing":
      return "Processing your speech";
    default:
      return "Voice mode indicator";
  }
}

export function WaveformVisualizer({
  state = "idle",
  barCount = 5,
  className = "",
}) {
  const bars = useMemo(
    () =>
      Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className={`weni-waveform__bar weni-waveform__bar--${i}`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      )),
    [barCount],
  );

  return (
    <div
      className={`weni-waveform weni-waveform--${state} ${className}`}
      role="img"
      aria-label={getAriaLabel(state)}
    >
      {bars}
    </div>
  );
}

WaveformVisualizer.propTypes = {
  state: PropTypes.oneOf(["idle", "listening", "speaking", "processing"]),
  barCount: PropTypes.number,
  className: PropTypes.string,
};

export default WaveformVisualizer;
