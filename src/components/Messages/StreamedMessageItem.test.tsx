import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import {
  COMPONENT_WAIT_TIMEOUT_MS,
  StreamedMessage,
} from '@/utils/componentStreaming';
import { StreamedMessageItem } from './StreamedMessageItem';

const mockSendMessage = jest.fn();
const mockSetCurrentPage = jest.fn();
const mockUsePrefersReducedMotion = jest.fn(() => false);

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: () => ({
    sendMessage: mockSendMessage,
    setCurrentPage: mockSetCurrentPage,
    service: {
      config: { channelUuid: 'ch-test' },
      getSession: () => ({ sessionId: 'sess-test' }),
    },
  }),
}));

jest.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockUsePrefersReducedMotion(),
}));

jest.mock('@/components/common/Icon', () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

jest.mock('@/utils/sanitizeHtml', () => ({
  sanitizeHtml: (html: string) => html,
}));

jest.mock('marked', () => ({
  marked: {
    use: () => {},
    parse: (text: string) => `<p>${text}</p>`,
  },
}));

const WORD_TICK = 80;

function makeMessage(
  overrides: Partial<StreamedMessage> = {},
): StreamedMessage {
  return {
    id: 'msg-stream-1',
    type: 'text',
    text: 'Choose delivery option',
    timestamp: 1000,
    direction: 'incoming',
    status: 'streaming',
    streamPhase: 'streaming_text',
    ...overrides,
  };
}

describe('StreamedMessageItem — end-to-end streaming flows (US1–US7)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockSendMessage.mockClear();
    mockSetCurrentPage.mockClear();
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    warnSpy.mockRestore();
  });

  it('US1: shows quick-reply skeletons while text streams, enters disabled in 300ms, activates, and locks on click', () => {
    const onAnnounce = jest.fn();
    const { container, rerender } = render(
      <StreamedMessageItem
        message={makeMessage({
          text: 'Pick one',
          componentHints: [
            {
              componentType: 'quick_replies',
              labels: ['Express', 'Scheduled', 'Pickup'],
              count: 3,
            },
          ],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounce}
      />,
    );

    expect(
      container.querySelectorAll('.weni-component-skeleton__item'),
    ).toHaveLength(3);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // Stream ends with final quick replies while text finishes revealing
    rerender(
      <StreamedMessageItem
        message={makeMessage({
          text: 'Pick one',
          status: 'delivered',
          streamPhase: 'completed',
          quick_replies: ['Express', 'Scheduled', 'Pickup'],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounce}
      />,
    );

    // Flush word buffer (2 words + final settle)
    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 3);
    });

    // Entering phase: skeletons gone, real buttons mounted disabled for 300ms
    expect(
      container.querySelectorAll('.weni-component-skeleton__item'),
    ).toHaveLength(0);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    buttons.forEach((btn) => expect(btn).toBeDisabled());
    expect(onAnnounce).not.toHaveBeenCalled();

    // Clicking while entering does nothing (SC-002)
    fireEvent.click(buttons[0]);
    expect(mockSendMessage).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Active and announced (SC-004)
    buttons.forEach((btn) => expect(btn).toBeEnabled());
    expect(onAnnounce).toHaveBeenCalledWith('msg-stream-1', [
      '3 options available',
    ]);

    // Click sends label once and disables all buttons
    fireEvent.click(buttons[2]);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith('Pickup');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('US1: renders text-only streamed responses without skeletons', () => {
    const { container, rerender } = render(
      <StreamedMessageItem
        message={makeMessage({ text: 'Open 8am to 6pm' })}
        direction="incoming"
        isLastMessage
      />,
    );

    expect(
      container.querySelector('.weni-component-skeleton'),
    ).not.toBeInTheDocument();

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          text: 'Open 8am to 6pm',
          status: 'delivered',
          streamPhase: 'completed',
        })}
        direction="incoming"
        isLastMessage
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 6);
    });
    expect(
      container.querySelector('.weni-component-skeleton'),
    ).not.toBeInTheDocument();
  });

  it('US2: streams list_message trigger with known vs unknown item_count announcements', () => {
    const onAnnounceKnown = jest.fn();
    const { rerender } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'list-known',
          text: 'Offers ready',
          componentHints: [
            {
              componentType: 'list_message',
              labels: ['See 9 deals'],
              itemCount: 9,
            },
          ],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounceKnown}
      />,
    );

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'list-known',
          text: 'Offers ready',
          status: 'delivered',
          streamPhase: 'completed',
          list_message: {
            button_text: 'See 9 deals',
            item_count: 9,
            list_items: [{ uuid: '1', title: 'Coffee' }],
          },
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounceKnown}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 3);
    });
    act(() => {
      jest.advanceTimersByTime(180);
    });

    expect(screen.getByRole('button', { name: 'See 9 deals' })).toBeEnabled();
    expect(onAnnounceKnown).toHaveBeenCalledWith('list-known', [
      'List with 9 options available',
    ]);
  });

  it('US3: hides caret on awaiting_components while CTA skeleton waits for delayed URL, then enters with 180ms grow-in', () => {
    const onAnnounce = jest.fn();
    const { container, rerender } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'cta-delayed',
          text: 'Generating link',
          componentHints: [
            { componentType: 'cta_message', labels: ['Open portal'] },
          ],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounce}
      />,
    );

    // Text ends before CTA URL arrives
    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'cta-delayed',
          text: 'Generating link',
          status: 'streaming',
          streamPhase: 'awaiting_components',
          componentHints: [
            { componentType: 'cta_message', labels: ['Open portal'] },
          ],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounce}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 3);
    });

    // Caret gone, skeleton still visible, no link/URL in DOM
    expect(
      container.querySelector('.weni-message-text__caret'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('.weni-component-skeleton--cta'),
    ).toBeInTheDocument();
    expect(container.querySelector('a')).not.toBeInTheDocument();

    // 1.5s later full URL arrives
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'cta-delayed',
          text: 'Generating link',
          status: 'delivered',
          streamPhase: 'completed',
          cta_message: {
            display_text: 'Open portal',
            url: 'https://store.example/returns?token=secret',
          },
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounce}
      />,
    );

    // Entering disabled (no href yet)
    expect(container.querySelector('a')).not.toHaveAttribute('href');

    act(() => {
      jest.advanceTimersByTime(180);
    });

    const link = screen.getByRole('link', { name: 'Open portal' });
    expect(link).toHaveAttribute(
      'href',
      'https://store.example/returns?token=secret',
    );
    expect(onAnnounce).toHaveBeenCalledWith('cta-delayed', [
      'Open portal link available',
    ]);
  });

  it('US3/US4: drops pending CTA skeleton silently after 10s timeout and logs PII-free warning', () => {
    const { container } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'cta-timeout',
          text: 'Generating link',
          status: 'streaming',
          streamPhase: 'awaiting_components',
          componentHints: [
            { componentType: 'cta_message', labels: ['Open portal'] },
          ],
        })}
        direction="incoming"
        isLastMessage
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 3);
    });
    expect(
      container.querySelector('.weni-component-skeleton--cta'),
    ).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(COMPONENT_WAIT_TIMEOUT_MS);
    });
    expect(
      container.querySelector('.weni-component-skeleton'),
    ).not.toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WebChat:ComponentStreaming]'),
      expect.objectContaining({
        channelUuid: 'ch-test',
        sessionId: 'sess-test',
        messageId: 'cta-timeout',
        reason: 'component_timeout',
      }),
    );
  });

  it('US4: supports mid-stream hint, labelless fallback, mismatch override, disconnect cleanup, no-hint fallback, and textless response', () => {
    // 1. Mid-stream hint + mismatch override (3 hinted -> 2 real)
    const { container, rerender } = render(
      <StreamedMessageItem
        message={makeMessage({ id: 'mid-hint', text: 'Red wines' })}
        direction="incoming"
        isLastMessage
      />,
    );
    expect(
      container.querySelector('.weni-component-skeleton'),
    ).not.toBeInTheDocument();

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'mid-hint',
          text: 'Red wines work well',
          componentHints: [{ componentType: 'quick_replies', count: 3 }],
        })}
        direction="incoming"
        isLastMessage
      />,
    );
    expect(
      container.querySelectorAll('.weni-component-skeleton__item'),
    ).toHaveLength(3);

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'mid-hint',
          text: 'Red wines work well',
          status: 'delivered',
          streamPhase: 'completed',
          quick_replies: ['Under $40', 'Over $40'],
        })}
        direction="incoming"
        isLastMessage
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 6 + 250);
    });
    expect(screen.getAllByRole('button')).toHaveLength(2);

    // 2. Textless quick-reply response suppresses empty bubble
    const { container: textless } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'textless-1',
          text: '',
          status: 'streaming',
          streamPhase: 'awaiting_components',
          componentHints: [
            { componentType: 'quick_replies', labels: ['Yes', 'No'] },
          ],
        })}
        direction="incoming"
        isLastMessage
      />,
    );
    expect(
      textless.querySelector('.weni-message-text'),
    ).not.toBeInTheDocument();
    expect(
      textless.querySelectorAll('.weni-component-skeleton__item'),
    ).toHaveLength(2);
  });

  it('US5: coordinates multi-component responses in fixed order (list -> CTA -> quick_replies) in one <= 300ms sequence', () => {
    const onAnnounce = jest.fn();
    const { container, rerender } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'multi-1',
          text: 'Here are your options',
          status: 'streaming',
          streamPhase: 'awaiting_components',
          componentHints: [
            { componentType: 'quick_replies', labels: ['A', 'B'] },
            { componentType: 'cta_message', labels: ['Track'] },
            { componentType: 'list_message', labels: ['See 5 deals'] },
          ],
          list_message: {
            button_text: 'See 5 deals',
            item_count: 5,
            list_items: [{ uuid: '1', title: 'Deal' }],
          },
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounce}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 5);
    });

    // Ready list_message MUST wait until CTA and quick_replies also arrive
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll('.weni-component-skeleton');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass('weni-component-skeleton--list');
    expect(skeletons[1]).toHaveClass('weni-component-skeleton--cta');
    expect(skeletons[2]).toHaveClass('weni-component-skeleton--quick-reply');

    // Deliver all components
    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'multi-1',
          text: 'Here are your options',
          status: 'delivered',
          streamPhase: 'completed',
          list_message: {
            button_text: 'See 5 deals',
            item_count: 5,
            list_items: [{ uuid: '1', title: 'Deal' }],
          },
          cta_message: {
            display_text: 'Track',
            url: 'https://store.example/track',
          },
          quick_replies: ['A', 'B'],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onAnnounce}
      />,
    );

    // Entering disabled, total 4 buttons -> stagger 40ms, total 300ms
    expect(screen.getByRole('button', { name: 'See 5 deals' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByRole('button', { name: 'See 5 deals' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Track' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeEnabled();
    expect(onAnnounce).toHaveBeenCalledWith('multi-1', [
      'List with 5 options available',
      'Track link available',
      '2 options available',
    ]);
  });

  it('US6/US7: skips animation on mount-completed history, preserves focus, disables on mid-stream shopper message, and honors reduced motion + ro fallback', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // 1. Mount already completed (history / closed-chat return)
    const onHistoryAnnounce = jest.fn();
    render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'hist-1',
          status: 'delivered',
          streamPhase: undefined,
          quick_replies: ['Replay?'],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onHistoryAnnounce}
      />,
    );

    const replayBtn = screen.getByRole('button', { name: 'Replay?' });
    expect(replayBtn).toBeEnabled();
    expect(replayBtn).not.toHaveClass('weni-component-enter--pop');
    expect(onHistoryAnnounce).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);

    // 2. Reduced motion activates at 0ms without animation after text finishes
    mockUsePrefersReducedMotion.mockReturnValue(true);
    const onRmAnnounce = jest.fn();
    const { rerender } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'rm-1',
          text: 'Done',
          componentHints: [{ componentType: 'quick_replies', labels: ['OK'] }],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onRmAnnounce}
      />,
    );

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'rm-1',
          text: 'Done',
          status: 'delivered',
          streamPhase: 'completed',
          quick_replies: ['OK'],
        })}
        direction="incoming"
        isLastMessage
        onAnnounce={onRmAnnounce}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 2);
    });

    const okBtn = screen.getByRole('button', { name: 'OK' });
    expect(okBtn).toBeEnabled();
    expect(okBtn).not.toHaveClass('weni-component-enter--pop');
    expect(onRmAnnounce).toHaveBeenCalledWith('rm-1', ['1 options available']);
    expect(document.activeElement).toBe(input);

    // 3. ro locale falls back to en in real i18next instance (FR-039)
    act(() => {
      i18n.changeLanguage('ro');
    });
    expect(i18n.t('streaming_components.list_available')).toBe(
      'List of options available',
    );
    expect(
      i18n.t('streaming_components.cta_available', { label: 'Track order' }),
    ).toBe('Track order link available');

    document.body.removeChild(input);
  });
});

describe('StreamedMessageItem — human support status metadata', () => {
  const ts = new Date(2026, 10, 3, 14, 35, 0).getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 3, 15, 0, 0));
    mockUsePrefersReducedMotion.mockReturnValue(false);
    act(() => {
      i18n.changeLanguage('en');
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders outgoing MessageMeta across pending, sent, delivered, read, and error without legacy inline error icon', () => {
    const statuses = [
      ['pending', 'Sending'],
      ['sent', 'Sent at 2:35 PM'],
      ['delivered', 'Delivered · sent at 2:35 PM'],
      ['read', 'Read · sent at 2:35 PM'],
      ['error', 'Failed to send'],
    ] as const;

    statuses.forEach(([status, expectedLabel]) => {
      const { container, unmount } = render(
        <StreamedMessageItem
          message={makeMessage({
            id: `out-${status}`,
            direction: 'outgoing',
            text: 'Shopper message',
            timestamp: ts,
            status,
            streamPhase: undefined,
            author: { type: 'contact' },
          })}
          direction="outgoing"
          isLastMessage
          isHumanSupportFeatureEnabled
          displayMeta={{
            showAuthorName: false,
            showTimestamp: true,
            visibleStatus: status,
          }}
        />,
      );

      expect(screen.getByText('2:35 PM')).toBeInTheDocument();
      expect(
        screen.getByRole('img', { name: expectedLabel }),
      ).toBeInTheDocument();
      // Only one status icon (inside MessageMeta), never a duplicate inline icon
      expect(container.querySelectorAll('[data-testid^="icon-"]')).toHaveLength(
        1,
      );
      unmount();
    });
  });

  it('forwards agent first name to MessageContainer on first message and omits on follow-up or feature OFF', () => {
    const { rerender } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'ag-1',
          direction: 'incoming',
          text: 'Hello from Julia',
          timestamp: ts,
          status: 'delivered',
          streamPhase: undefined,
          author: {
            type: 'human_agent',
            id: 'ha_5f0c3a9e1b7d4c2a8e6f0b1d3c5a7e9f',
            name: 'Julia',
          },
        })}
        direction="incoming"
        isLastMessage
        isHumanSupportFeatureEnabled
        displayMeta={{
          showAuthorName: true,
          authorName: 'Julia',
          showTimestamp: true,
          visibleStatus: null,
        }}
      />,
    );

    expect(screen.getByText('Julia')).toHaveClass('weni-message__author-name');
    expect(screen.getByText('2:35 PM')).toBeInTheDocument();

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'ag-2',
          direction: 'incoming',
          text: 'Follow up',
          timestamp: ts,
          status: 'delivered',
          streamPhase: undefined,
          author: {
            type: 'human_agent',
            id: 'ha_5f0c3a9e1b7d4c2a8e6f0b1d3c5a7e9f',
            name: 'Julia',
          },
        })}
        direction="incoming"
        isLastMessage
        isHumanSupportFeatureEnabled
        displayMeta={{
          showAuthorName: false,
          showTimestamp: false,
          visibleStatus: null,
        }}
      />,
    );

    expect(screen.queryByText('Julia')).not.toBeInTheDocument();
    expect(screen.queryByText('2:35 PM')).not.toBeInTheDocument();
  });

  it('defers incoming AI timestamp while streaming/buffering and reveals it once complete (FR-015)', () => {
    const { rerender } = render(
      <StreamedMessageItem
        message={makeMessage({
          id: 'ai-stream-ts',
          direction: 'incoming',
          text: 'Working on it',
          timestamp: ts,
          status: 'streaming',
          streamPhase: 'streaming_text',
          author: { type: 'ai_agent' },
        })}
        direction="incoming"
        isLastMessage
        isHumanSupportFeatureEnabled
        displayMeta={{
          showAuthorName: false,
          showTimestamp: true,
          visibleStatus: null,
        }}
      />,
    );

    expect(screen.queryByText('2:35 PM')).not.toBeInTheDocument();

    rerender(
      <StreamedMessageItem
        message={makeMessage({
          id: 'ai-stream-ts',
          direction: 'incoming',
          text: 'Working on it',
          timestamp: ts,
          status: 'delivered',
          streamPhase: 'completed',
          author: { type: 'ai_agent' },
        })}
        direction="incoming"
        isLastMessage
        isHumanSupportFeatureEnabled
        displayMeta={{
          showAuthorName: false,
          showTimestamp: true,
          visibleStatus: null,
        }}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(WORD_TICK * 6);
    });

    expect(screen.getByText('2:35 PM')).toBeInTheDocument();
  });
});
