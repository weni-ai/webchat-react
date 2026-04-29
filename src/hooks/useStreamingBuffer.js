import { useState, useEffect, useRef } from 'react';
import { useMessagesScroll } from '@/contexts/MessagesScrollContext';

const WORD_REVEAL_BASE_MS = 70;
const WORD_REVEAL_JITTER_MS = 20;

function nextDelay() {
  return WORD_REVEAL_BASE_MS + (Math.random() * 2 - 1) * WORD_REVEAL_JITTER_MS;
}

function countWords(text) {
  return (text.match(/\S+/g) || []).length;
}

function getWordsUpTo(text, wordCount) {
  const tokens = text.match(/\S+\s*/g) || [];
  return tokens.slice(0, wordCount).join('');
}

/**
 * Simulates a word-by-word typing buffer for streaming messages.
 *
 * When `isStreaming` first becomes true, the hook reveals `text` one word at a
 * time between `WORD_REVEAL_BASE_MS` and `WORD_REVEAL_BASE_MS + WORD_REVEAL_JITTER_MS`
 * text prop updates. The animation only stops after all buffered words are
 * shown AND streaming has ended, so a fast stream never skips the effect.
 *
 * To disable buffering entirely, replace the hook call with:
 *   const displayedText = text;
 *   const isBuffering = isStreaming;
 */
export function useStreamingBuffer({ text, isStreaming }) {
  const onWordRevealed = useMessagesScroll();
  const [displayedText, setDisplayedText] = useState(() =>
    isStreaming ? '' : text || '',
  );
  const [isBuffering, setIsBuffering] = useState(isStreaming);

  const targetTextRef = useRef(text || '');
  const isStreamingRef = useRef(isStreaming);
  const revealedWordCountRef = useRef(0);
  const bufferingStartedRef = useRef(isStreaming);
  const onWordRevealedRef = useRef(onWordRevealed);

  useEffect(() => {
    onWordRevealedRef.current = onWordRevealed;
  }, [onWordRevealed]);

  useEffect(() => {
    targetTextRef.current = text || '';
  }, [text]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Activate buffering the first time streaming is detected
  useEffect(() => {
    if (isStreaming && !bufferingStartedRef.current) {
      bufferingStartedRef.current = true;
      revealedWordCountRef.current = 0;
      setDisplayedText('');
      setIsBuffering(true);
    }
  }, [isStreaming]);

  // Word-reveal loop — runs until all buffered words are shown AND streaming ended
  useEffect(() => {
    if (!isBuffering) return;

    let timer;

    function scheduleNext() {
      timer = setTimeout(() => {
        const target = targetTextRef.current;
        const totalWords = countWords(target);

        if (revealedWordCountRef.current < totalWords) {
          revealedWordCountRef.current += 1;
          setDisplayedText(getWordsUpTo(target, revealedWordCountRef.current));
          onWordRevealedRef.current?.();
          scheduleNext();
          return;
        }

        if (!isStreamingRef.current) {
          setDisplayedText(target);
          setIsBuffering(false);
          bufferingStartedRef.current = false;
        } else {
          scheduleNext();
        }
      }, nextDelay());
    }

    scheduleNext();

    return () => clearTimeout(timer);
  }, [isBuffering]);

  return { displayedText, isBuffering };
}
