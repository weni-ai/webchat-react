import { renderHook, act } from '@testing-library/react';
import { useStreamingBuffer } from '@/hooks/useStreamingBuffer';

jest.mock('@/contexts/MessagesScrollContext', () => ({
  useMessagesScroll: jest.fn(() => null),
}));

const { useMessagesScroll } = require('@/contexts/MessagesScrollContext');

// With Math.random() = 0.5 → delay = 70 + (0)*20 = 70ms exactly.
// TICK > 70ms so each advanceTimersByTime(TICK) fires exactly one scheduled word.
const TICK = 80;

describe('useStreamingBuffer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    useMessagesScroll.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('shows full text immediately when not streaming', () => {
      const { result } = renderHook(() =>
        useStreamingBuffer({ text: 'hello world', isStreaming: false }),
      );

      expect(result.current.displayedText).toBe('hello world');
      expect(result.current.isBuffering).toBe(false);
    });

    it('starts with empty text and isBuffering when streaming begins', () => {
      const { result } = renderHook(() =>
        useStreamingBuffer({ text: 'hello world', isStreaming: true }),
      );

      expect(result.current.displayedText).toBe('');
      expect(result.current.isBuffering).toBe(true);
    });

    it('shows empty string when text is empty and not streaming', () => {
      const { result } = renderHook(() =>
        useStreamingBuffer({ text: '', isStreaming: false }),
      );

      expect(result.current.displayedText).toBe('');
      expect(result.current.isBuffering).toBe(false);
    });
  });

  describe('word-by-word reveal', () => {
    it('reveals one word per timer tick', () => {
      const { result } = renderHook(() =>
        useStreamingBuffer({ text: 'one two three', isStreaming: true }),
      );

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one ');

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one two ');

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one two three');
    });

    it('calls onWordRevealed from context on each word reveal', () => {
      const onWordRevealed = jest.fn();
      useMessagesScroll.mockReturnValue(onWordRevealed);

      renderHook(() =>
        useStreamingBuffer({ text: 'one two three', isStreaming: true }),
      );

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(onWordRevealed).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(onWordRevealed).toHaveBeenCalledTimes(2);

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(onWordRevealed).toHaveBeenCalledTimes(3);
    });

    it('does not throw when context returns null', () => {
      useMessagesScroll.mockReturnValue(null);

      const { result } = renderHook(() =>
        useStreamingBuffer({ text: 'one two', isStreaming: true }),
      );

      expect(() => {
        act(() => {
          jest.advanceTimersByTime(TICK);
        });
      }).not.toThrow();

      expect(result.current.displayedText).toBe('one ');
    });

    it('reveals newly arrived words when text prop grows mid-stream', () => {
      const { result, rerender } = renderHook(
        ({ text, isStreaming }) => useStreamingBuffer({ text, isStreaming }),
        { initialProps: { text: 'one', isStreaming: true } },
      );

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one');

      act(() => {
        rerender({ text: 'one two three', isStreaming: true });
      });

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one two ');

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one two three');
    });
  });

  describe('streaming lifecycle', () => {
    it('keeps isBuffering true while streaming even after all words are shown', () => {
      const { result } = renderHook(() =>
        useStreamingBuffer({ text: 'one two', isStreaming: true }),
      );

      act(() => {
        jest.advanceTimersByTime(TICK * 2);
      });

      expect(result.current.displayedText).toBe('one two');
      expect(result.current.isBuffering).toBe(true);
    });

    it('stops buffering and shows final text when streaming ends and queue is empty', () => {
      const { result, rerender } = renderHook(
        ({ text, isStreaming }) => useStreamingBuffer({ text, isStreaming }),
        { initialProps: { text: 'one two', isStreaming: true } },
      );

      act(() => {
        jest.advanceTimersByTime(TICK * 2);
      });
      expect(result.current.isBuffering).toBe(true);

      act(() => {
        rerender({ text: 'one two', isStreaming: false });
      });

      act(() => {
        jest.advanceTimersByTime(TICK);
      });

      expect(result.current.isBuffering).toBe(false);
      expect(result.current.displayedText).toBe('one two');
    });

    it('continues revealing words after streaming ends if buffer is not empty', () => {
      const { result, rerender } = renderHook(
        ({ text, isStreaming }) => useStreamingBuffer({ text, isStreaming }),
        { initialProps: { text: '', isStreaming: true } },
      );

      act(() => {
        rerender({ text: 'one two three', isStreaming: false });
      });

      expect(result.current.isBuffering).toBe(true);

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one ');

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one two ');

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.displayedText).toBe('one two three');

      act(() => {
        jest.advanceTimersByTime(TICK);
      });
      expect(result.current.isBuffering).toBe(false);
    });

    it('sets exact final text (not word-tokenised) when buffering ends', () => {
      const text = 'hello   world'; // multiple spaces between words
      const { result, rerender } = renderHook(
        ({ text: t, isStreaming }) =>
          useStreamingBuffer({ text: t, isStreaming }),
        { initialProps: { text, isStreaming: true } },
      );

      act(() => {
        jest.advanceTimersByTime(TICK * 2);
      });

      act(() => {
        rerender({ text, isStreaming: false });
      });

      act(() => {
        jest.advanceTimersByTime(TICK);
      });

      expect(result.current.displayedText).toBe(text);
      expect(result.current.isBuffering).toBe(false);
    });
  });
});
