import PropTypes from "prop-types";
import { Icon } from "@/components/common/Icon";
import { Button } from "@/components/common/Button";

export function VoiceModeError({ error, onRetry, onDismiss, texts = {} }) {
  const title = texts.errorTitle || "Something went wrong";

  return (
    <div className="weni-voice-error" role="alert">
      <Icon name="error" size="x-large" className="weni-voice-error__icon" />

      <h2 className="weni-voice-error__title">{title}</h2>

      {error.message && (
        <p className="weni-voice-error__message">{error.message}</p>
      )}

      {error.suggestion && (
        <p className="weni-voice-error__suggestion">{error.suggestion}</p>
      )}

      <div className="weni-voice-error__actions">
        {error.recoverable && onRetry && (
          <Button
            variant="secondary"
            icon="refresh"
            onClick={onRetry}
            className="weni-voice-error__retry-btn"
          >
            {texts.retry || "Try again"}
          </Button>
        )}

        <Button
          variant="tertiary"
          onClick={onDismiss}
          className="weni-voice-error__dismiss-btn"
        >
          {texts.dismiss || "Dismiss"}
        </Button>
      </div>
    </div>
  );
}

VoiceModeError.propTypes = {
  error: PropTypes.shape({
    code: PropTypes.string,
    message: PropTypes.string,
    suggestion: PropTypes.string,
    recoverable: PropTypes.bool,
  }).isRequired,
  onRetry: PropTypes.func,
  onDismiss: PropTypes.func.isRequired,
  texts: PropTypes.shape({
    errorTitle: PropTypes.string,
    retry: PropTypes.string,
    dismiss: PropTypes.string,
  }),
};

export default VoiceModeError;
