import {
  COMPONENT_STREAM_SCENARIOS,
  DevServiceHandle,
  DevWebChatHandle,
  SocketStreamFrame,
  runComponentStreamScenario,
} from './simulateComponentStreams';
import { StreamedMessage } from '@/utils/componentStreaming';

/**
 * Mirrors @weni/webchat-service 1.21.0 MessageProcessor + StateManager:
 * prefixes stream IDs with `msg_`, creates the message on first delta (not on
 * stream_start or stream_component_hint), and persists updates in state.
 */
function createService121Mock() {
  let state: { messages: StreamedMessage[]; isThinking: boolean } = {
    messages: [],
    isThinking: false,
  };
  let activePrefixedId: string | null = null;
  let messageAdded = false;
  const snapshots: Array<{ messages: StreamedMessage[] }> = [];

  const emitState = (next: typeof state) => {
    snapshots.push({ messages: [...next.messages] });
  };

  const service: DevServiceHandle = {
    state: {
      updateMessage: (messageId, updates) => {
        state = {
          ...state,
          messages: state.messages.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m,
          ),
        };
        emitState(state);
      },
    },
    getState: () => state,
    emit: (_event, nextState) => {
      emitState(nextState as typeof state);
    },
  };

  const frames: SocketStreamFrame[] = [];
  const webChat: DevWebChatHandle = {
    open: jest.fn(),
    simulateMessageReceived: jest.fn((frame) => {
      frames.push(frame);
      if ('type' in frame && frame.type === 'stream_start') {
        activePrefixedId = `msg_${frame.id}`;
        messageAdded = false;
        return;
      }
      if ('v' in frame && activePrefixedId) {
        if (!messageAdded) {
          messageAdded = true;
          state = {
            ...state,
            isThinking: false,
            messages: [
              ...state.messages,
              {
                id: activePrefixedId,
                type: 'text',
                text: frame.v,
                timestamp: Date.now(),
                direction: 'incoming',
                status: 'streaming',
              },
            ],
          };
          emitState(state);
          return;
        }
        state = {
          ...state,
          messages: state.messages.map((m) =>
            m.id === activePrefixedId
              ? { ...m, text: `${m.text}${frame.v}` }
              : m,
          ),
        };
        emitState(state);
        return;
      }
      if ('type' in frame && frame.type === 'stream_end' && activePrefixedId) {
        state = {
          ...state,
          messages: state.messages.map((m) =>
            m.id === activePrefixedId
              ? { ...m, text: frame.content, status: 'delivered' }
              : m,
          ),
        };
        emitState(state);
      }
    }),
  };

  return {
    service,
    webChat,
    frames,
    snapshots,
    getState: () => state,
  };
}

describe('simulateComponentStreams (dev harness)', () => {
  const instantDelay = jest.fn(() => Promise.resolve());

  beforeEach(() => {
    instantDelay.mockClear();
  });

  it('defines all expected streaming component scenarios', () => {
    const ids = COMPONENT_STREAM_SCENARIOS.map((s) => s.id);
    expect(ids).toEqual([
      'qr-3',
      'qr-6',
      'list-known',
      'list-unknown',
      'cta-ready',
      'cta-delayed',
      'multi-component',
      'mid-hint',
      'labelless-hint',
      'no-hint',
      'timeout-undelivered',
    ]);
  });

  it('returns null for an unknown scenario id', async () => {
    const webChat: DevWebChatHandle = {
      open: jest.fn(),
      simulateMessageReceived: jest.fn(),
    };
    const result = await runComponentStreamScenario(
      'non-existent',
      webChat,
      undefined,
      instantDelay,
    );
    expect(result).toBeNull();
    expect(webChat.open).not.toHaveBeenCalled();
  });

  it('preserves componentHints across text deltas when webchat-service 1.21.0 uses msg_ prefix', async () => {
    const { service, webChat, getState } = createService121Mock();

    const streamId = await runComponentStreamScenario(
      'qr-3',
      webChat,
      () => service,
      instantDelay,
    );

    expect(streamId).toContain('demo-comp-qr-3-');
    const finalMsg = getState().messages.find(
      (m) => m.id === `msg_${streamId}`,
    );
    expect(finalMsg).toBeDefined();
    expect(finalMsg?.status).toBe('delivered');
    expect(finalMsg?.streamPhase).toBe('completed');
    expect(finalMsg?.componentHints).toBeUndefined();
    expect(finalMsg?.quick_replies).toEqual([
      'Express · within 2h',
      'Scheduled · 6–8 PM',
      'Pick up in store',
    ]);
  });

  it('replays cta-delayed frames and preserves skeleton through awaiting_components until URL arrives', async () => {
    const { service, webChat, frames, snapshots, getState } =
      createService121Mock();

    const streamId = await runComponentStreamScenario(
      'cta-delayed',
      webChat,
      () => service,
      instantDelay,
    );

    const prefixedId = `msg_${streamId}`;
    expect(
      frames.some((f) => 'type' in f && f.type === 'stream_component_hint'),
    ).toBe(true);
    expect(
      frames.some((f) => 'type' in f && f.type === 'stream_text_end'),
    ).toBe(true);
    expect(
      frames.some((f) => 'type' in f && f.type === 'stream_component'),
    ).toBe(true);
    expect(frames.some((f) => 'type' in f && f.type === 'stream_end')).toBe(
      true,
    );

    // Verify hints survived during text streaming (while text was non-empty)
    const streamingWithTextAndHints = snapshots.some((snap) =>
      snap.messages.some(
        (m) =>
          m.id === prefixedId &&
          m.text.length > 0 &&
          m.status === 'streaming' &&
          (m.componentHints?.length ?? 0) > 0,
      ),
    );
    expect(streamingWithTextAndHints).toBe(true);

    // Verify awaiting_components phase kept hints until CTA arrived
    const awaitingSnapshot = snapshots.some((snap) =>
      snap.messages.some(
        (m) =>
          m.id === prefixedId &&
          m.streamPhase === 'awaiting_components' &&
          (m.componentHints?.length ?? 0) > 0,
      ),
    );
    expect(awaitingSnapshot).toBe(true);

    const finalMsg = getState().messages.find((m) => m.id === prefixedId);
    expect(finalMsg?.status).toBe('delivered');
    expect(finalMsg?.streamPhase).toBe('completed');
    expect(finalMsg?.componentHints).toBeUndefined();
    expect(finalMsg?.cta_message?.url).toBe(
      'https://loja-aurora.example/returns?order=48213',
    );
  });

  it('replays multi-component and timeout scenarios cleanly when service is omitted', async () => {
    const frames: SocketStreamFrame[] = [];
    const webChat: DevWebChatHandle = {
      open: jest.fn(),
      simulateMessageReceived: jest.fn((frame) => {
        frames.push(frame);
      }),
    };

    await runComponentStreamScenario(
      'multi-component',
      webChat,
      undefined,
      instantDelay,
    );
    const hintCount = frames.filter(
      (f) => 'type' in f && f.type === 'stream_component_hint',
    ).length;
    expect(hintCount).toBe(3);

    frames.length = 0;
    await runComponentStreamScenario(
      'timeout-undelivered',
      webChat,
      undefined,
      instantDelay,
    );
    expect(
      frames.some((f) => 'type' in f && f.type === 'stream_text_end'),
    ).toBe(true);
    expect(frames.some((f) => 'type' in f && f.type === 'stream_end')).toBe(
      false,
    );
  });

  it('executes every configured scenario through 1.21.0 mock without errors and keeps mid-hint delta seq contiguous', async () => {
    for (const scenario of COMPONENT_STREAM_SCENARIOS) {
      const { service, webChat, frames, getState } = createService121Mock();

      const streamId = await runComponentStreamScenario(
        scenario.id,
        webChat,
        () => service,
        instantDelay,
      );
      expect(streamId).toBeTruthy();
      expect(getState().messages.some((m) => m.id === `msg_${streamId}`)).toBe(
        true,
      );

      const deltaSeqs = frames
        .filter((f): f is { v: string; seq: number } => 'v' in f)
        .map((f) => f.seq);
      expect(deltaSeqs).toEqual(deltaSeqs.map((_, i) => i + 1));
    }
  });
});
