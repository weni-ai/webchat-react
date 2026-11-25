import PropTypes from 'prop-types';

import Icon from '@/components/common/Icon';
import Button from '@/components/common/Button';
import {
  COMPONENT_ENTER_DURATION_MS,
  isValidCtaUrl,
} from '@/utils/componentStreaming';

import './CallToAction.scss';

export function CallToAction({
  buttonText,
  url,
  disabled = false,
  animate = false,
  staggerOffset = 0,
  staggerMs = 0,
  durationMs = COMPONENT_ENTER_DURATION_MS,
}) {
  if (!isValidCtaUrl(url)) {
    return null;
  }

  const shouldAnimateButton = animate && durationMs > 0;
  const enterStyle = shouldAnimateButton
    ? {
        '--weni-enter-duration': `${durationMs}ms`,
        '--weni-enter-delay': `${Math.round(staggerOffset * staggerMs)}ms`,
      }
    : undefined;

  return (
    <section className="weni-call-to-action">
      <Button
        key={buttonText}
        className={`weni-call-to-action__button${shouldAnimateButton ? ' weni-component-enter--grow' : ''}`}
        variant="secondary"
        disabled={disabled}
        style={enterStyle}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon
          name="open_in_new"
          size="medium"
        />
        {buttonText}
      </Button>
    </section>
  );
}

CallToAction.propTypes = {
  buttonText: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  animate: PropTypes.bool,
  staggerOffset: PropTypes.number,
  staggerMs: PropTypes.number,
  durationMs: PropTypes.number,
};
