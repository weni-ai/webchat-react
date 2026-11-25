import { act, renderHook } from '@testing-library/react';
import {
  COMPONENT_WAIT_TIMEOUT_MS,
  StreamedMessage,
} from '@/utils/componentStreaming';
import {
  UseComponentStreamLifecycleParams,
  useComponentStreamLifecycle,
} from './useComponentStreamLifecycle';

function makeMessage(
  overrides: Partial<StreamedMessage> = {},
): StreamedMessage {
  return {
    id: 'msg-1',
    type: 'text',
    text: 'Pick an option:',
    timestamp: 1000,
    direction: 'incoming',
    status: 'streaming',
    streamPhase: 'streaming_text',
    ...overrides,
  };
}

function makeParams(
  overrides: Partial<UseComponentStreamLifecycleParams> = {},
): UseComponentStreamLifecycleParams {
  const message = overrides.message ?? makeMessage();
  return {
    message,
    isTextStreaming: true,
    isBuffering: true,
    isLastMessage: true,
    prefersReducedMotion: false,
    logContext: {
      channelUuid: 'ch-1',
      sessionId: 'sess-1',
      messageId: message.id,
    },
    onActivate: jest.fn(),
    ...overrides,
  };
}

describe('useComponentStreamLifecycle', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    warnSpy.mockRestore();
  });

  it('starts directly in ready state with no animation or announcement when mounted already completed', () => {
    const onActivate = jest.fn();
    const { result } = renderHook(() =>
      useComponentStreamLifecycle(
        makeParams({
          message: makeMessage({
            status: 'delivered',
            streamPhase: undefined,
            quick_replies: ['Yes', 'No'],
          }),
          isTextStreaming: false,
          isBuffering: false,
          onActivate,
        }),
      ),
    );

    expect(result.current.phase).toBe('ready');
    expect(result.current.showRealComponents).toBe(true);
    expect(result.current.shouldAnimate).toBe(false);
    expect(result.current.componentsDisabled).toBe(false);
    expect(result.current.visibleSkeletonHints).toEqual([]);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('keeps skeletons during text buffering, enters disabled for <= 300ms, then activates and announces', () => {
    const onActivate = jest.fn();
    const initial = makeParams({
      message: makeMessage({
        componentHints: [
          { componentType: 'quick_replies', labels: ['A', 'B', 'C'] },
        ],
      }),
      onActivate,
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    expect(result.current.phase).toBe('skeleton');
    expect(result.current.visibleSkeletonHints).toHaveLength(1);
    expect(result.current.showRealComponents).toBe(false);
    expect(result.current.componentsDisabled).toBe(true);

    rerender(
      makeParams({
        message: makeMessage({
          status: 'delivered',
          streamPhase: 'completed',
          quick_replies: ['A', 'B', 'C'],
        }),
        isTextStreaming: false,
        isBuffering: false,
        onActivate,
      }),
    );

    expect(result.current.phase).toBe('entering');
    expect(result.current.showRealComponents).toBe(true);
    expect(result.current.shouldAnimate).toBe(true);
    expect(result.current.componentsDisabled).toBe(true);
    expect(onActivate).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current.phase).toBe('entering');
    expect(result.current.componentsDisabled).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('ready');
    expect(result.current.componentsDisabled).toBe(false);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('activates immediately (0ms) without animation under prefers-reduced-motion', () => {
    const onActivate = jest.fn();
    const initial = makeParams({
      message: makeMessage({
        componentHints: [{ componentType: 'quick_replies', labels: ['A'] }],
      }),
      prefersReducedMotion: true,
      onActivate,
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    expect(result.current.phase).toBe('skeleton');

    rerender(
      makeParams({
        message: makeMessage({
          status: 'delivered',
          streamPhase: 'completed',
          quick_replies: ['A'],
        }),
        isTextStreaming: false,
        isBuffering: false,
        prefersReducedMotion: true,
        onActivate,
      }),
    );

    expect(result.current.phase).toBe('ready');
    expect(result.current.shouldAnimate).toBe(false);
    expect(result.current.componentsDisabled).toBe(false);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('drops pending skeleton after 10s timeout with PII-free warning and releases complete siblings', () => {
    const onActivate = jest.fn();
    const initial = makeParams({
      message: makeMessage({
        status: 'streaming',
        streamPhase: 'awaiting_components',
        componentHints: [
          { componentType: 'list_message', labels: ['See deals'] },
          { componentType: 'cta_message', labels: ['Open portal'] },
        ],
        list_message: {
          button_text: 'See deals',
          list_items: [{ uuid: '1', title: 'Deal 1' }],
        },
      }),
      isTextStreaming: false,
      isBuffering: false,
      onActivate,
    });

    const { result } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    expect(result.current.phase).toBe('skeleton');
    expect(result.current.showRealComponents).toBe(false);

    act(() => {
      jest.advanceTimersByTime(COMPONENT_WAIT_TIMEOUT_MS);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WebChat:ComponentStreaming]'),
      expect.objectContaining({
        messageId: 'msg-1',
        componentTypes: ['cta_message'],
        reason: 'component_timeout',
      }),
    );
    expect(result.current.phase).toBe('entering');
    expect(result.current.showRealComponents).toBe(true);

    act(() => {
      jest.advanceTimersByTime(180);
    });
    expect(result.current.phase).toBe('ready');
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('starts 10s timeout immediately on textless hint and resets if text deltas arrive later', () => {
    const initial = makeParams({
      message: makeMessage({
        text: '',
        status: 'streaming',
        streamPhase: 'streaming_text',
        componentHints: [{ componentType: 'cta_message', labels: ['Track'] }],
      }),
      isTextStreaming: true,
      isBuffering: true,
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    act(() => {
      jest.advanceTimersByTime(6_000);
    });
    expect(result.current.visibleSkeletonHints).toHaveLength(1);

    // Late text delta arrives: timer should cancel while text is streaming
    rerender(
      makeParams({
        message: makeMessage({
          text: 'Generating your link now...',
          status: 'streaming',
          streamPhase: 'streaming_text',
          componentHints: [{ componentType: 'cta_message', labels: ['Track'] }],
        }),
        isTextStreaming: true,
        isBuffering: true,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(8_000);
    });
    // Still streaming text — skeleton must NOT have timed out prematurely
    expect(result.current.visibleSkeletonHints).toHaveLength(1);
    expect(warnSpy).not.toHaveBeenCalled();

    // Text finishes; new 10s wait starts
    rerender(
      makeParams({
        message: makeMessage({
          text: 'Generating your link now...',
          status: 'streaming',
          streamPhase: 'awaiting_components',
          componentHints: [{ componentType: 'cta_message', labels: ['Track'] }],
        }),
        isTextStreaming: false,
        isBuffering: false,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(COMPONENT_WAIT_TIMEOUT_MS);
    });
    expect(result.current.phase).toBe('ready');
    expect(result.current.visibleSkeletonHints).toEqual([]);
  });

  it('removes skeletons immediately without error when stream completes or disconnects without components', () => {
    const initial = makeParams({
      message: makeMessage({
        componentHints: [{ componentType: 'quick_replies', labels: ['A'] }],
      }),
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    expect(result.current.visibleSkeletonHints).toHaveLength(1);

    rerender(
      makeParams({
        message: makeMessage({
          status: 'delivered',
          streamPhase: 'completed',
          componentHints: undefined,
        }),
        isTextStreaming: false,
        isBuffering: false,
      }),
    );

    expect(result.current.phase).toBe('ready');
    expect(result.current.visibleSkeletonHints).toEqual([]);
  });

  it('animates no-hint streamed components upon text completion (BD-008)', () => {
    const onActivate = jest.fn();
    const initial = makeParams({
      message: makeMessage({ componentHints: undefined }),
      onActivate,
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    expect(result.current.visibleSkeletonHints).toEqual([]);

    rerender(
      makeParams({
        message: makeMessage({
          status: 'delivered',
          streamPhase: 'completed',
          quick_replies: ['Yes', 'No'],
        }),
        isTextStreaming: false,
        isBuffering: false,
        onActivate,
      }),
    );

    expect(result.current.phase).toBe('entering');
    expect(result.current.shouldAnimate).toBe(true);
    expect(result.current.componentsDisabled).toBe(true);

    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(result.current.phase).toBe('ready');
    expect(result.current.componentsDisabled).toBe(false);
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('keeps components disabled and skips announcement when message stops being the last message mid-stream', () => {
    const onActivate = jest.fn();
    const initial = makeParams({
      message: makeMessage({
        componentHints: [{ componentType: 'quick_replies', labels: ['Yes'] }],
      }),
      isLastMessage: true,
      onActivate,
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    rerender(
      makeParams({
        message: makeMessage({
          status: 'delivered',
          streamPhase: 'completed',
          quick_replies: ['Yes'],
        }),
        isTextStreaming: false,
        isBuffering: false,
        isLastMessage: false,
        onActivate,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(180);
    });

    expect(result.current.phase).toBe('ready');
    expect(result.current.componentsDisabled).toBe(true);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('logs invalid_cta_url once without exposing URL PII when CTA has an invalid URL', () => {
    renderHook(() =>
      useComponentStreamLifecycle(
        makeParams({
          message: makeMessage({
            status: 'streaming',
            streamPhase: 'awaiting_components',
            componentHints: [
              { componentType: 'cta_message', labels: ['Open'] },
            ],
            cta_message: {
              display_text: 'Open',
              url: 'javascript:alert(secret)',
            },
          }),
          isTextStreaming: false,
          isBuffering: false,
        }),
      ),
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(warnSpy.mock.calls);
    expect(serialized).toContain('invalid_cta_url');
    expect(serialized).not.toContain('secret');
  });

  it('retains delivered component skeletons while word buffering finishes after fast stream_end clears componentHints', () => {
    const initial = makeParams({
      message: makeMessage({
        text: '',
        componentHints: [
          { componentType: 'cta_message', labels: ['Acessar'], count: 1 },
          { componentType: 'quick_replies', labels: ['Sim', 'Não'], count: 2 },
        ],
      }),
      isTextStreaming: true,
      isBuffering: true,
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    expect(result.current.visibleSkeletonHints).toHaveLength(2);

    // Fast stream_end clears componentHints while useStreamingBuffer is still revealing words,
    // delivering only cta_message (quick_replies undelivered must unmount immediately).
    rerender(
      makeParams({
        message: makeMessage({
          text: 'Claro! Aqui está o CTA:',
          status: 'delivered',
          streamPhase: 'completed',
          componentHints: undefined,
          cta_message: { display_text: 'Acessar', url: 'https://weni.ai' },
        }),
        isTextStreaming: false,
        isBuffering: true,
      }),
    );

    expect(result.current.phase).toBe('skeleton');
    expect(result.current.visibleSkeletonHints).toEqual([
      { componentType: 'cta_message', labels: ['Acessar'], count: 1 },
    ]);

    // Once word buffering finishes, transition directly into entering without skeleton flicker
    rerender(
      makeParams({
        message: makeMessage({
          text: 'Claro! Aqui está o CTA:',
          status: 'delivered',
          streamPhase: 'completed',
          componentHints: undefined,
          cta_message: { display_text: 'Acessar', url: 'https://weni.ai' },
        }),
        isTextStreaming: false,
        isBuffering: false,
      }),
    );

    expect(result.current.phase).toBe('entering');
    expect(result.current.visibleSkeletonHints).toEqual([]);
  });

  it('drops skeletons immediately when stream_end clears componentHints with no delivered components even while still buffering', () => {
    const initial = makeParams({
      message: makeMessage({
        text: 'Texto parcial',
        componentHints: [
          { componentType: 'quick_replies', labels: ['Sim', 'Não'], count: 2 },
        ],
      }),
      isTextStreaming: true,
      isBuffering: true,
    });

    const { result, rerender } = renderHook(
      (props: UseComponentStreamLifecycleParams) =>
        useComponentStreamLifecycle(props),
      { initialProps: initial },
    );

    expect(result.current.visibleSkeletonHints).toHaveLength(1);

    rerender(
      makeParams({
        message: makeMessage({
          text: 'Texto parcial',
          status: 'delivered',
          streamPhase: 'completed',
          componentHints: undefined,
        }),
        isTextStreaming: false,
        isBuffering: true,
      }),
    );

    expect(result.current.visibleSkeletonHints).toEqual([]);
  });
});
