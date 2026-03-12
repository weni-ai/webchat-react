import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { WaveformVisualizer } from './WaveformVisualizer';
import './VoiceModeButton.scss';

const VOICE_STATE_TO_ANIMATION = {
  speaking: 'speaking',
  processing: 'processing',
  thinking: 'processing',
  listening: 'listening',
  listening_active: 'listening',
};

export function VoiceModeButton({
  onClick,
  disabled = false,
  isActive = false,
  voiceState = 'idle',
  className = '',
}) {
  const { t } = useTranslation();

  if (isActive) {
    const animState = VOICE_STATE_TO_ANIMATION[voiceState] || 'listening';

    return (
      <Button
        variant="primary"
        onClick={onClick}
        disabled={disabled}
        className={`weni-voice-mode-btn weni-voice-mode-btn--active ${className}`}
        aria-label={t('voice_mode.aria_exit')}
      >
        <WaveformVisualizer
          state={animState}
          barCount={4}
          className="weni-voice-mode-btn__waveform"
        />
        <span className="weni-voice-mode-btn__label">
          {t('voice_mode.stop')}
        </span>
      </Button>
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
      aria-label={t('voice_mode.aria_enter')}
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
