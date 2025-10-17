import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import Icon from '@/components/common/Icon';
import './ThinkingIndicator.scss';

/**
 * ThinkingIndicator - Animated thinking indicator with rotating messages
 * 
 * Displays rotating messages with icons to indicate AI is thinking/processing.
 * Messages change every 4-7.5 seconds with smooth fade animations.
 */
export function ThinkingIndicator({ className = '' }) {
  const { t } = useTranslation();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const timeoutRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  const messages = [
    {
      text: t('thinking.messages.processing'),
      icon: 'article',
    },
    {
      text: t('thinking.messages.connecting'),
      icon: 'lightbulb',
    },
    {
      text: t('thinking.messages.refining'),
      icon: 'auto_awesome',
    },
    {
      text: t('thinking.messages.structuring'),
      icon: 'chat_bubble',
    },
    {
      text: t('thinking.messages.almost'),
      icon: 'rocket_launch',
    },
  ];

  const scheduleNextMessage = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentMessageIndex >= messages.length - 1) {
      return;
    }

    // Random delay between 4 and 7.5 seconds
    const delay = (4 + Math.random() * 3.5) * 1000;
    
    timeoutRef.current = setTimeout(() => {
      setIsAnimatingOut(true);

      animationTimeoutRef.current = setTimeout(() => {
        setCurrentMessageIndex(prev => prev + 1);
        setIsAnimatingOut(false);
      }, 500); // Match CSS animation duration
    }, delay);
  };

  useEffect(() => {
    scheduleNextMessage();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [currentMessageIndex, messages.length]);

  const currentMessage = messages[currentMessageIndex];

  const getClassWithAnimationState = (className) => {
    return `${className} ${isAnimatingOut ? `${className}--out` : `${className}--in`}`;
  };

  return (
    <section className={`weni-thinking-indicator ${className}`}>
      <Icon 
        name={currentMessage.icon}
        size="small"
        color="fg-base"
        className={getClassWithAnimationState('weni-thinking-indicator__icon')}
      />
      <p 
        className={getClassWithAnimationState('weni-thinking-indicator__text')}
      >
        {currentMessage.text}
      </p>
    </section>
  );
}

ThinkingIndicator.propTypes = {
  className: PropTypes.string,
};

export default ThinkingIndicator;

