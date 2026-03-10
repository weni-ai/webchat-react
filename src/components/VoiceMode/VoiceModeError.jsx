import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/common/Icon';
import { Button } from '@/components/common/Button';

export function VoiceModeError({ error, onRetry, onDismiss, texts = {} }) {
  const { t } = useTranslation();

  const title = texts.errorTitle || t('voice_mode.errorTitle');
  const message = t(`voice_mode.errors.${error.code}.message`, {
    defaultValue: error.message,
  });
  const suggestion = t(`voice_mode.errors.${error.code}.suggestion`, {
    defaultValue: error.suggestion,
  });

  return (
    <section
      className="weni-voice-error"
      role="alert"
    >
      <Icon
        name="error"
        size="x-large"
        className="weni-voice-error__icon"
      />

      <h2 className="weni-voice-error__title">{title}</h2>

      {message && (
        <p className="weni-voice-error__message">{message}</p>
      )}

      {suggestion && (
        <p className="weni-voice-error__suggestion">{suggestion}</p>
      )}

      <section className="weni-voice-error__actions">
        {error.recoverable && onRetry && (
          <Button
            variant="secondary"
            icon="refresh"
            onClick={onRetry}
            className="weni-voice-error__retry-btn"
          >
            {texts.retry || t('voice_mode.errors.retry')}
          </Button>
        )}

        <Button
          variant="tertiary"
          onClick={onDismiss}
          className="weni-voice-error__dismiss-btn"
        >
          {texts.dismiss || t('voice_mode.errors.dismiss')}
        </Button>
      </section>
    </section>
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
