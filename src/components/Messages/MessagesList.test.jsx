/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
import { render, screen, fireEvent, act } from '@testing-library/react';

// jsdom does not implement scrollIntoView — polyfill it globally for all tests
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (
        key === 'messages_list.items_added_to_cart' &&
        options?.count != null
      ) {
        return `${options.count} items added`;
      }
      return key;
    },
  }),
}));

jest.mock('@/hooks/useWeniChat', () => ({ useWeniChat: jest.fn() }));
jest.mock('@/contexts/ChatContext', () => ({ useChatContext: jest.fn() }));
jest.mock('@/contexts/ConversationStartersContext', () => ({
  useConversationStarters: jest.fn(),
}));

jest.mock('./MessageContainer', () => ({
  __esModule: true,
  default: ({ children, className }) => (
    <div
      data-testid="message-container"
      className={className}
    >
      {children}
    </div>
  ),
}));
jest.mock('./MessageText', () => ({
  __esModule: true,
  default: ({ message }) => (
    <div data-testid="message-text">{message.text}</div>
  ),
}));
jest.mock('./MessageImage', () => ({
  __esModule: true,
  default: () => <div data-testid="message-image" />,
}));
jest.mock('./MessageVideo', () => ({
  __esModule: true,
  default: () => <div data-testid="message-video" />,
}));
jest.mock('./MessageAudio', () => ({
  __esModule: true,
  default: () => <div data-testid="message-audio" />,
}));
jest.mock('./MessageDocument', () => ({
  __esModule: true,
  default: () => <div data-testid="message-document" />,
}));
jest.mock('./MessageOrder', () => ({
  __esModule: true,
  default: () => <div data-testid="message-order" />,
}));
jest.mock('./TypingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="typing-indicator" />,
}));
jest.mock('./ThinkingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="thinking-indicator" />,
}));
jest.mock('@/components/Chat/ChatPresentation', () => ({
  ChatPresentation: () => <div data-testid="chat-presentation" />,
}));
jest.mock('@/components/common/Icon', () => ({
  __esModule: true,
  default: ({ name }) => <span data-testid={`icon-${name}`} />,
}));
jest.mock('@/components/common/FSButton', () => ({
  FSButton: ({ children, onClick, 'aria-label': ariaLabel, className }) => (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));
jest.mock('../common/FSBadge', () => ({
  FSBadge: ({ children }) => <div data-testid="fs-badge">{children}</div>,
}));
jest.mock('@/components/ConversationStarters/ConversationStarters', () => ({
  ConversationStartersFull: ({ questions, onStarterClick }) => (
    <div data-testid="conversation-starters-full">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onStarterClick(q)}
        >
          {q}
        </button>
      ))}
    </div>
  ),
}));
jest.mock('./TextComponents/QuickReplies', () => ({
  QuickReplies: ({ quickReplies }) => (
    <div data-testid="quick-replies">
      {quickReplies.map((qr) => (
        <span key={qr.payload ?? qr}>{qr.title ?? qr}</span>
      ))}
    </div>
  ),
}));
jest.mock('./TextComponents/ShowItems', () => ({
  ShowItems: () => <div data-testid="show-items" />,
}));
jest.mock('@/contexts/MessagesScrollContext', () => ({
  MessagesScrollProvider: jest.fn(({ children }) => children),
}));

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import { useConversationStarters } from '@/contexts/ConversationStartersContext';
import { MessagesScrollProvider } from '@/contexts/MessagesScrollContext';
import { Message, MessagesList } from './MessagesList';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMessage(overrides = {}) {
  return {
    id: 'msg-1',
    type: 'text',
    direction: 'incoming',
    text: 'Hello',
    timestamp: 1000,
    status: 'sent',
    ...overrides,
  };
}

function buildGroup(messages, direction = 'incoming') {
  return { direction, messages };
}

function buildWeniChatMock(overrides = {}) {
  return {
    isTyping: false,
    isThinking: false,
    messageGroups: [],
    isChatOpen: true,
    ...overrides,
  };
}

function buildChatContextMock(overrides = {}) {
  return {
    isVoiceModeActive: false,
    voicePartialTranscript: '',
    ...overrides,
  };
}

function buildConversationStartersMock(overrides = {}) {
  return {
    questions: [],
    isInChatStartersDismissed: false,
    handleFullStarterClick: jest.fn(),
    ...overrides,
  };
}

function setupMocks(weniChat = {}, chatContext = {}, starters = {}) {
  useWeniChat.mockReturnValue(buildWeniChatMock(weniChat));
  useChatContext.mockReturnValue(buildChatContextMock(chatContext));
  useConversationStarters.mockReturnValue(
    buildConversationStartersMock(starters),
  );
}

// ---------------------------------------------------------------------------
// Message (exported)
// ---------------------------------------------------------------------------

describe('Message — type routing', () => {
  const msg = (type) => buildMessage({ id: 'x', type });

  it('renders MessageText for type "text"', () => {
    render(<Message message={msg('text')} />);
    expect(screen.getByTestId('message-text')).toBeInTheDocument();
  });

  it('renders MessageText for type "message"', () => {
    render(<Message message={msg('message')} />);
    expect(screen.getByTestId('message-text')).toBeInTheDocument();
  });

  it('renders MessageImage for type "image"', () => {
    render(<Message message={msg('image')} />);
    expect(screen.getByTestId('message-image')).toBeInTheDocument();
  });

  it('renders MessageVideo for type "video"', () => {
    render(<Message message={msg('video')} />);
    expect(screen.getByTestId('message-video')).toBeInTheDocument();
  });

  it('renders MessageAudio for type "audio"', () => {
    render(<Message message={msg('audio')} />);
    expect(screen.getByTestId('message-audio')).toBeInTheDocument();
  });

  it('renders MessageDocument for type "document"', () => {
    render(<Message message={msg('document')} />);
    expect(screen.getByTestId('message-document')).toBeInTheDocument();
  });

  it('renders MessageDocument for type "file"', () => {
    render(<Message message={msg('file')} />);
    expect(screen.getByTestId('message-document')).toBeInTheDocument();
  });

  it('renders MessageOrder for type "order"', () => {
    render(<Message message={msg('order')} />);
    expect(screen.getByTestId('message-order')).toBeInTheDocument();
  });

  it('falls back to MessageText for unknown types', () => {
    render(<Message message={msg('unknown')} />);
    expect(screen.getByTestId('message-text')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — basic structure
// ---------------------------------------------------------------------------

describe('MessagesList — basic structure', () => {
  it('renders without crashing when there are no messages', () => {
    setupMocks();
    const { container } = render(<MessagesList />);
    expect(container.querySelector('.weni-messages-list')).toBeInTheDocument();
  });

  it('always renders ChatPresentation', () => {
    setupMocks();
    render(<MessagesList />);
    expect(screen.getByTestId('chat-presentation')).toBeInTheDocument();
  });

  it('renders a direction-group section for each message group', () => {
    setupMocks({
      messageGroups: [
        buildGroup([buildMessage({ id: 'a' })], 'incoming'),
        buildGroup(
          [buildMessage({ id: 'b', direction: 'outgoing' })],
          'outgoing',
        ),
      ],
    });
    const { container } = render(<MessagesList />);
    const groups = container.querySelectorAll(
      '.weni-messages-list__direction-group',
    );
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });

  it('applies incoming direction class to incoming group', () => {
    setupMocks({
      messageGroups: [buildGroup([buildMessage({ id: 'a' })], 'incoming')],
    });
    const { container } = render(<MessagesList />);
    expect(
      container.querySelector('.weni-messages-list__direction-group--incoming'),
    ).toBeInTheDocument();
  });

  it('applies outgoing direction class to outgoing group', () => {
    setupMocks({
      messageGroups: [
        buildGroup(
          [buildMessage({ id: 'b', direction: 'outgoing' })],
          'outgoing',
        ),
      ],
    });
    const { container } = render(<MessagesList />);
    expect(
      container.querySelector('.weni-messages-list__direction-group--outgoing'),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — typing / thinking indicators
// ---------------------------------------------------------------------------

describe('MessagesList — typing/thinking indicators', () => {
  it('shows TypingIndicator when isTyping is true', () => {
    setupMocks({ isTyping: true });
    render(<MessagesList />);
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('shows ThinkingIndicator when isThinking is true', () => {
    setupMocks({ isThinking: true });
    render(<MessagesList />);
    expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
  });

  it('shows ThinkingIndicator (not TypingIndicator) when both isTyping and isThinking are true', () => {
    setupMocks({ isTyping: true, isThinking: true });
    render(<MessagesList />);
    expect(screen.getByTestId('thinking-indicator')).toBeInTheDocument();
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  it('hides both indicators when neither isTyping nor isThinking', () => {
    setupMocks({ isTyping: false, isThinking: false });
    render(<MessagesList />);
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('thinking-indicator')).not.toBeInTheDocument();
  });

  it('typing group has --typing modifier class', () => {
    setupMocks({ isTyping: true });
    const { container } = render(<MessagesList />);
    expect(
      container.querySelector('.weni-messages-list__direction-group--typing'),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — voice partial transcript
// ---------------------------------------------------------------------------

describe('MessagesList — voice partial transcript', () => {
  it('renders the partial transcript text when voice mode is active', () => {
    setupMocks(
      {},
      { isVoiceModeActive: true, voicePartialTranscript: 'hello world' },
    );
    render(<MessagesList />);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('does not render transcript section when voicePartialTranscript is empty', () => {
    setupMocks({}, { isVoiceModeActive: true, voicePartialTranscript: '' });
    const { container } = render(<MessagesList />);
    expect(
      container.querySelector(
        '.weni-messages-list__message--voice-transcribing',
      ),
    ).not.toBeInTheDocument();
  });

  it('does not render transcript section when voice mode is inactive', () => {
    setupMocks(
      {},
      { isVoiceModeActive: false, voicePartialTranscript: 'hello' },
    );
    const { container } = render(<MessagesList />);
    expect(
      container.querySelector(
        '.weni-messages-list__message--voice-transcribing',
      ),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — conversation starters (full)
// ---------------------------------------------------------------------------

describe('MessagesList — conversation starters full', () => {
  it('renders ConversationStartersFull when questions exist, not dismissed, and no messages', () => {
    setupMocks(
      { messageGroups: [] },
      {},
      { questions: ['Q1', 'Q2'], isInChatStartersDismissed: false },
    );
    render(<MessagesList />);
    expect(
      screen.getByTestId('conversation-starters-full'),
    ).toBeInTheDocument();
  });

  it('does not render ConversationStartersFull when messageGroups is not empty', () => {
    setupMocks(
      { messageGroups: [buildGroup([buildMessage({ id: 'a' })], 'incoming')] },
      {},
      { questions: ['Q1'], isInChatStartersDismissed: false },
    );
    render(<MessagesList />);
    expect(
      screen.queryByTestId('conversation-starters-full'),
    ).not.toBeInTheDocument();
  });

  it('does not render ConversationStartersFull when starters are dismissed', () => {
    setupMocks(
      { messageGroups: [] },
      {},
      { questions: ['Q1'], isInChatStartersDismissed: true },
    );
    render(<MessagesList />);
    expect(
      screen.queryByTestId('conversation-starters-full'),
    ).not.toBeInTheDocument();
  });

  it('does not render ConversationStartersFull when questions array is empty', () => {
    setupMocks({ messageGroups: [] }, {}, { questions: [] });
    render(<MessagesList />);
    expect(
      screen.queryByTestId('conversation-starters-full'),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — message status icons
// ---------------------------------------------------------------------------

describe('MessagesList — message status icons', () => {
  it('renders the pending (schedule) icon for a pending message', () => {
    setupMocks({
      messageGroups: [
        buildGroup([buildMessage({ id: 'p', status: 'pending' })], 'outgoing'),
      ],
    });
    render(<MessagesList />);
    expect(screen.getByTestId('icon-schedule')).toBeInTheDocument();
  });

  it('renders the error icon for an errored message', () => {
    setupMocks({
      messageGroups: [
        buildGroup([buildMessage({ id: 'e', status: 'error' })], 'outgoing'),
      ],
    });
    render(<MessagesList />);
    expect(screen.getByTestId('icon-error')).toBeInTheDocument();
  });

  it('does not render status icons for a sent message', () => {
    setupMocks({
      messageGroups: [
        buildGroup([buildMessage({ id: 's', status: 'sent' })], 'outgoing'),
      ],
    });
    render(<MessagesList />);
    expect(screen.queryByTestId('icon-schedule')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-error')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — quick replies
// ---------------------------------------------------------------------------

describe('MessagesList — quick replies', () => {
  it('renders QuickReplies when the message has quick_replies', () => {
    const message = buildMessage({
      id: 'qr-msg',
      direction: 'incoming',
      quick_replies: [{ title: 'Yes', payload: 'yes' }],
    });
    setupMocks({
      messageGroups: [buildGroup([message], 'incoming')],
    });
    render(<MessagesList />);
    expect(screen.getByTestId('quick-replies')).toBeInTheDocument();
  });

  it('does not render QuickReplies when quick_replies is empty', () => {
    const message = buildMessage({ id: 'no-qr', quick_replies: [] });
    setupMocks({ messageGroups: [buildGroup([message], 'incoming')] });
    render(<MessagesList />);
    expect(screen.queryByTestId('quick-replies')).not.toBeInTheDocument();
  });

  it('does not render QuickReplies when quick_replies is absent', () => {
    const message = buildMessage({ id: 'no-qr-2' });
    setupMocks({ messageGroups: [buildGroup([message], 'incoming')] });
    render(<MessagesList />);
    expect(screen.queryByTestId('quick-replies')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — product list
// ---------------------------------------------------------------------------

describe('MessagesList — product list', () => {
  it('renders ShowItems when message has a product_list', () => {
    const message = buildMessage({
      id: 'pl-msg',
      product_list: { buttonText: 'View', items: [] },
    });
    setupMocks({ messageGroups: [buildGroup([message], 'incoming')] });
    render(<MessagesList />);
    expect(screen.getByTestId('show-items')).toBeInTheDocument();
  });

  it('does not render ShowItems when product_list is absent', () => {
    setupMocks({
      messageGroups: [buildGroup([buildMessage({ id: 'x' })], 'incoming')],
    });
    render(<MessagesList />);
    expect(screen.queryByTestId('show-items')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MessagesList — conversation_status messages
// ---------------------------------------------------------------------------

describe('MessagesList — conversation_status messages', () => {
  function statusMsg(id, text = 'Order placed', statusType = 'success') {
    return buildMessage({ id, type: 'conversation_status', text, statusType });
  }

  it('renders a single conversation_status message as an FSBadge', () => {
    setupMocks({
      messageGroups: [buildGroup([statusMsg('s1')], 'incoming')],
    });
    render(<MessagesList />);
    expect(screen.getByTestId('fs-badge')).toBeInTheDocument();
    expect(screen.getByText('Order placed')).toBeInTheDocument();
  });

  it('collapses two consecutive conversation_status messages into one badge', () => {
    setupMocks({
      messageGroups: [
        buildGroup(
          [statusMsg('s1', 'Item 1'), statusMsg('s2', 'Item 2')],
          'incoming',
        ),
      ],
    });
    render(<MessagesList />);
    const badges = screen.getAllByTestId('fs-badge');
    expect(badges).toHaveLength(1);
  });

  it('collapsed badge shows the item count', () => {
    setupMocks({
      messageGroups: [
        buildGroup(
          [statusMsg('s1'), statusMsg('s2'), statusMsg('s3')],
          'incoming',
        ),
      ],
    });
    render(<MessagesList />);
    expect(screen.getByText('3 items added')).toBeInTheDocument();
  });

  it('renders each single conversation_status message as its own badge', () => {
    setupMocks({
      messageGroups: [
        buildGroup(
          [
            statusMsg('s1', 'First'),
            buildMessage({ id: 'm1' }),
            statusMsg('s2', 'Second'),
          ],
          'incoming',
        ),
      ],
    });
    render(<MessagesList />);
    const badges = screen.getAllByTestId('fs-badge');
    expect(badges).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// GoToBottomButton
// ---------------------------------------------------------------------------

describe('MessagesList — GoToBottomButton', () => {
  function triggerShowGoToBottom(container) {
    const list = container.querySelector('.weni-messages-list');
    Object.defineProperty(list, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(list, 'clientHeight', {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true });
    fireEvent.scroll(list);
  }

  it('renders the go-to-bottom button when user is scrolled away from bottom', () => {
    setupMocks();
    const { container } = render(<MessagesList />);
    triggerShowGoToBottom(container);
    expect(
      container.querySelector('.weni-messages-list__go-to-bottom-button'),
    ).toBeInTheDocument();
  });

  it('go-to-bottom button has the expected aria-label', () => {
    setupMocks();
    const { container } = render(<MessagesList />);
    triggerShowGoToBottom(container);
    expect(
      screen.getByLabelText('messages_list.scroll_to_bottom'),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// scrollToBottomOnReveal
// ---------------------------------------------------------------------------

describe('scrollToBottomOnReveal', () => {
  function getOnWordRevealed() {
    // MessagesScrollProvider is a jest.fn(); its most-recent call's first
    // argument contains the onWordRevealed prop passed by MessagesList.
    return MessagesScrollProvider.mock.calls.at(-1)[0].onWordRevealed;
  }

  function scrollListFarFromBottom(container) {
    const list = container.querySelector('.weni-messages-list');
    Object.defineProperty(list, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(list, 'clientHeight', {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true });
    fireEvent.scroll(list);
  }

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView.mockClear();
  });

  it('calls scrollIntoView when the user is near the bottom (default)', () => {
    setupMocks();
    render(<MessagesList />);
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    getOnWordRevealed()();

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(
      1,
    );
  });

  it('does not call scrollIntoView when the user has scrolled far from the bottom', () => {
    setupMocks();
    const { container } = render(<MessagesList />);
    // Scroll away from bottom so isNearBottomRef becomes false
    scrollListFarFromBottom(container);
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    getOnWordRevealed()();

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// visualViewport resize effect
// ---------------------------------------------------------------------------

describe('visualViewport resize effect', () => {
  let mockVv;

  beforeEach(() => {
    jest.useFakeTimers();
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    mockVv = {
      height: 800,
      _listeners: {},
      addEventListener: jest.fn((event, cb) => {
        mockVv._listeners[event] = cb;
      }),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, 'visualViewport', {
      value: mockVv,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(window, 'visualViewport', {
      value: null,
      configurable: true,
    });
  });

  it('registers a resize listener on visualViewport', () => {
    setupMocks();
    render(<MessagesList />);
    expect(mockVv.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('calls scrollToBottom with instant behavior when the viewport shrinks', () => {
    setupMocks();
    render(<MessagesList />);
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    // Simulate soft-keyboard appearance (viewport height decreases)
    mockVv.height = 600;
    mockVv._listeners['resize']();

    // Flush the requestAnimationFrame scheduled inside handleViewportResize
    act(() => jest.advanceTimersByTime(17));

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'instant',
    });
  });

  it('does not scroll when the viewport height increases', () => {
    setupMocks();
    render(<MessagesList />);
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    // Simulate keyboard being dismissed (height grows — no scroll expected)
    mockVv.height = 1000;
    mockVv._listeners['resize']();

    act(() => jest.advanceTimersByTime(17));

    expect(
      window.HTMLElement.prototype.scrollIntoView,
    ).not.toHaveBeenCalledWith({ behavior: 'instant' });
  });

  it('removes the resize listener from visualViewport on unmount', () => {
    setupMocks();
    const { unmount } = render(<MessagesList />);
    unmount();
    expect(mockVv.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('does not throw and skips the listener when visualViewport is unavailable', () => {
    Object.defineProperty(window, 'visualViewport', {
      value: null,
      configurable: true,
    });
    setupMocks();
    expect(() => render(<MessagesList />)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// isChatOpen scroll effect
// ---------------------------------------------------------------------------

describe('isChatOpen scroll effect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.HTMLElement.prototype.scrollIntoView.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call scrollToBottom before the 50 ms delay elapses', () => {
    setupMocks({ isChatOpen: true });
    render(<MessagesList />);
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    act(() => jest.advanceTimersByTime(49));

    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('calls scrollToBottom with instant behavior after the 50 ms delay', () => {
    setupMocks({ isChatOpen: true });
    render(<MessagesList />);
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    act(() => jest.advanceTimersByTime(50));

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'instant',
    });
  });

  it('re-triggers the scroll when isChatOpen changes', () => {
    setupMocks({ isChatOpen: false });
    const { rerender } = render(<MessagesList />);
    window.HTMLElement.prototype.scrollIntoView.mockClear();

    useWeniChat.mockReturnValue(buildWeniChatMock({ isChatOpen: true }));
    rerender(<MessagesList />);

    act(() => jest.advanceTimersByTime(50));

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'instant',
    });
  });

  it('cancels the pending timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    setupMocks({ isChatOpen: true });
    const { unmount } = render(<MessagesList />);
    clearTimeoutSpy.mockClear();

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// GoToBottomButton click
// ---------------------------------------------------------------------------

describe('GoToBottomButton click', () => {
  function showGoToBottomButton(container) {
    const list = container.querySelector('.weni-messages-list');
    Object.defineProperty(list, 'scrollHeight', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(list, 'clientHeight', {
      value: 500,
      configurable: true,
    });
    Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true });
    fireEvent.scroll(list);
  }

  it('clicking the button calls scrollIntoView with smooth behavior', () => {
    setupMocks();
    const { container } = render(<MessagesList />);
    showGoToBottomButton(container);

    window.HTMLElement.prototype.scrollIntoView.mockClear();
    fireEvent.click(screen.getByLabelText('messages_list.scroll_to_bottom'));

    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(
      1,
    );
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
    });
  });
});
