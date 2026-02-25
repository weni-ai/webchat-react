import PropTypes from "prop-types";
import { Button } from "@/components/common/Button";
import "./VoiceModeButton.scss";

export function VoiceModeButton({ onClick, disabled = false, className = "" }) {
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
  className: PropTypes.string,
};

export default VoiceModeButton;
