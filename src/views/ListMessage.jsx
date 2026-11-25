import PropTypes from 'prop-types';
import Button from '@/components/common/Button';
import { useState, useMemo } from 'react';
import { useWeniChat } from '@/hooks/useWeniChat';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
  COMPONENT_ENTER_DURATION_MS,
  computeListItemStaggerMs,
} from '@/utils/componentStreaming';

import './ListMessage.scss';

export function ListMessage({ options, animateEntrance = false }) {
  const { t } = useTranslation();
  const { goBack, sendMessage } = useWeniChat();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const shouldAnimateOptions = animateEntrance && !prefersReducedMotion;
  const itemStaggerMs = useMemo(
    () => (shouldAnimateOptions ? computeListItemStaggerMs(options.length) : 0),
    [shouldAnimateOptions, options.length],
  );

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  const handleSend = () => {
    if (!selectedOption || hasSubmitted) return;
    setHasSubmitted(true);
    sendMessage(selectedOption);
    goBack();
  };

  const isTouchDevice = useMemo(
    () =>
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0,
    [],
  );

  return (
    <section className="weni-view-list-message">
      <section className="weni-view-list-message__options">
        {options.map((option, index) => {
          const enterStyle = shouldAnimateOptions
            ? {
                '--weni-enter-duration': `${COMPONENT_ENTER_DURATION_MS}ms`,
                '--weni-enter-delay': `${Math.round(index * itemStaggerMs)}ms`,
              }
            : undefined;

          return (
            <Button
              key={`${index}-${option}`}
              className={
                shouldAnimateOptions
                  ? 'weni-view-list-message__option weni-component-enter--pop'
                  : 'weni-view-list-message__option'
              }
              variant="secondary"
              alignContent="start"
              style={enterStyle}
              onClick={() => handleOptionChange(option)}
              hoverState={selectedOption === option}
            >
              {option}
            </Button>
          );
        })}
      </section>

      {!selectedOption && isTouchDevice && (
        <section className="weni-view-list-message__instruction">
          {t('list_message.instruction')}
        </section>
      )}

      <footer className="weni-view-list-message__footer">
        <Button
          variant="tertiary"
          onClick={goBack}
        >
          {t('list_message.actions.back')}
        </Button>

        <Button
          variant="primary"
          disabled={!selectedOption || hasSubmitted}
          onClick={handleSend}
        >
          {t('list_message.actions.send')}
        </Button>
      </footer>
    </section>
  );
}

ListMessage.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  animateEntrance: PropTypes.bool,
};
