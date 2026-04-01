import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './WaveformVisualizer.scss';

const ARIA_LABEL_KEYS = {
  listening: 'voice_mode.aria_listening',
  speaking: 'voice_mode.aria_speaking',
  processing: 'voice_mode.aria_processing',
};

export function WaveformVisualizer({
  state = 'idle',
  barCount = 5,
  className = '',
}) {
  const { t } = useTranslation();

  const bars = useMemo(
    () =>
      Array.from({ length: barCount }, (_, i) => (
        <span
          key={i}
          className={`weni-waveform__bar weni-waveform__bar--${i}`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      )),
    [barCount],
  );

  return (
    <section
      className={`weni-waveform weni-waveform--${state} ${className}`}
      role="img"
      aria-label={t(ARIA_LABEL_KEYS[state] || 'voice_mode.aria_indicator')}
    >
      {bars}
    </section>
  );
}

WaveformVisualizer.propTypes = {
  state: PropTypes.oneOf(['idle', 'listening', 'speaking', 'processing']),
  barCount: PropTypes.number,
  className: PropTypes.string,
};

export default WaveformVisualizer;
