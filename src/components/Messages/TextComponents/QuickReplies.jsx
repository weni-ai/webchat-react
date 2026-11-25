import { useState } from 'react';
import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import { FSButton } from '@/components/common/FSButton';
import {
  COMPONENT_ENTER_DURATION_MS,
  normalizeQuickReplies,
} from '@/utils/componentStreaming';

import './QuickReplies.scss';

export function QuickReplies({
  quickReplies,
  disabled = false,
  animate = false,
  staggerOffset = 0,
  staggerMs = 0,
  durationMs = COMPONENT_ENTER_DURATION_MS,
}) {
  const { sendMessage } = useWeniChat();
  const [hasClicked, setHasClicked] = useState(false);

  const normalized = normalizeQuickReplies(quickReplies);
  const isDisabled = disabled || hasClicked;

  const handleClick = (label) => {
    if (isDisabled) return;
    setHasClicked(true);
    sendMessage(label);
  };

  return (
    <section className="weni-quick-replies">
      {normalized.map((item, index) => {
        const shouldAnimateButton = animate && durationMs > 0;
        const enterStyle = shouldAnimateButton
          ? {
              '--weni-enter-duration': `${durationMs}ms`,
              '--weni-enter-delay': `${Math.round((staggerOffset + index) * staggerMs)}ms`,
            }
          : undefined;

        return (
          <FSButton
            className={`weni-quick-replies__button${shouldAnimateButton ? ' weni-component-enter--pop' : ''}`}
            key={item.key}
            variant="tertiary"
            disabled={isDisabled}
            style={enterStyle}
            onClick={() => handleClick(item.label)}
          >
            {item.label}
          </FSButton>
        );
      })}
    </section>
  );
}

QuickReplies.propTypes = {
  quickReplies: PropTypes.array.isRequired,
  disabled: PropTypes.bool,
  animate: PropTypes.bool,
  staggerOffset: PropTypes.number,
  staggerMs: PropTypes.number,
  durationMs: PropTypes.number,
};
