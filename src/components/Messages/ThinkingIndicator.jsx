import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import Icon from '@/components/common/Icon';
import './ThinkingIndicator.scss';

const SLIDE_DURATION_MS = 500;

/**
 * ThinkingIndicator - Animated thinking indicator with rotating messages
 *
 * Displays rotating messages with icons to indicate AI is thinking/processing.
 * Messages change every 4-7.5 seconds with smooth fade animations.
 * An optional `text` prop overrides rotation and slides to each new value.
 */
export function ThinkingIndicator({ className = '', text = null }) {
  const { t } = useTranslation();
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [displayedText, setDisplayedText] = useState(null);
  const timeoutRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  const initTimeoutRef = useRef(null);
  const trackRef = useRef(null);
  const wrapperRef = useRef(null);

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
      icon: 'wand_stars',
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

  const hasExternalText = typeof text === 'string' && text.trim().length > 0;
  const rotationText = messages[currentMessageIndex].text;
  const committedText = displayedText ?? (hasExternalText ? text : rotationText);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  };

  const scheduleNextMessage = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentMessageIndex >= messages.length - 1) {
      return;
    }

    const delay = (4 + Math.random() * 3.5) * 1000;

    timeoutRef.current = setTimeout(() => {
      setIsAnimatingOut(true);

      animationTimeoutRef.current = setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1);
        setDisplayedText(messages[currentMessageIndex + 1]?.text);
        setIsAnimatingOut(false);
      }, SLIDE_DURATION_MS);
    }, delay);
  };

  useEffect(() => {
    initTimeoutRef.current = setTimeout(() => {
      setIsInitializing(false);
      setDisplayedText(hasExternalText ? text : messages[0].text);
    }, SLIDE_DURATION_MS);
    return () => clearTimeout(initTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once on mount
  }, []);

  useEffect(() => {
    if (hasExternalText || isInitializing) {
      clearTimers();
      return undefined;
    }

    scheduleNextMessage();

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMessageIndex, messages.length, hasExternalText, isInitializing]);

  useEffect(() => {
    if (!hasExternalText || isInitializing) {
      return undefined;
    }

    if (text === committedText) {
      return undefined;
    }

    setIsAnimatingOut(true);

    animationTimeoutRef.current = setTimeout(() => {
      setDisplayedText(text);
      setIsAnimatingOut(false);
    }, SLIDE_DURATION_MS);

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, hasExternalText, isInitializing]);

  const isSliding = isAnimatingOut || isInitializing;
  const outgoingText = committedText;
  const incomingText = isInitializing
    ? hasExternalText
      ? text
      : rotationText
    : isAnimatingOut
      ? hasExternalText
        ? text
        : messages[currentMessageIndex + 1]?.text
      : committedText;

  useLayoutEffect(() => {
    const track = trackRef.current;
    const wrapper = wrapperRef.current;
    if (!track || !wrapper) return;

    const paragraphs = track.querySelectorAll('.weni-thinking-indicator__text');
    const outgoing = paragraphs[0];
    const incoming = paragraphs[paragraphs.length - 1];
    const outgoingHeight = outgoing?.offsetHeight ?? 0;
    const incomingHeight = incoming?.offsetHeight ?? 0;

    if (paragraphs.length > 1) {
      track.style.setProperty('--thinking-slide-offset', `${outgoingHeight}px`);
    } else {
      track.style.removeProperty('--thinking-slide-offset');
    }

    if (incomingHeight > 0) {
      wrapper.style.setProperty(
        '--thinking-wrapper-height',
        `${incomingHeight}px`,
      );
    }
  }, [isSliding, outgoingText, incomingText]);

  return (
    <>
      <section className={`weni-thinking-indicator ${className}`}>
        <Icon
          name="progress_activity"
          size="small"
          color="weni-main-color"
          className="weni-fs-button__loading-spinner weni-thinking-indicator__icon"
        />

        <div
          ref={wrapperRef}
          className="weni-thinking-indicator__text-wrapper"
        >
          <div
            ref={trackRef}
            className={`weni-thinking-indicator__text-track${isSliding ? ' weni-thinking-indicator__text-track--sliding' : ''}`}
          >
            {isInitializing && (
              <p className="weni-thinking-indicator__text">&nbsp;</p>
            )}
            {!isInitializing && isAnimatingOut && (
              <p className="weni-thinking-indicator__text">{outgoingText}</p>
            )}
            <p
              key={incomingText}
              className="weni-thinking-indicator__text"
            >
              {incomingText}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

ThinkingIndicator.propTypes = {
  className: PropTypes.string,
  text: PropTypes.string,
};

export default ThinkingIndicator;
