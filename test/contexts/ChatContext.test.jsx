import { render, act, renderHook } from '@testing-library/react';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext';
import { navigateIfSameDomain } from '@/experimental/navigateIfSameDomain';
import i18n from '@/i18n';

jest.mock('@/experimental/navigateIfSameDomain', () => ({
  navigateIfSameDomain: jest.fn(),
}));

const WeniWebchatService = require('@weni/webchat-service');

const baseConfig = {
  socketUrl: 'wss://example.test',
  channelUuid: '00000000-0000-0000-0000-000000000000',
  host: 'https://example.test',
};

function stubChatServiceDelegates() {
  WeniWebchatService.prototype.addProductToCart = jest.fn();
  WeniWebchatService.prototype.setCustomField = jest.fn();
  WeniWebchatService.prototype.addConversationStatus = jest.fn();
  WeniWebchatService.prototype.sendOrder = jest.fn();
  WeniWebchatService.prototype.requestVoiceTokens = jest
    .fn()
    .mockResolvedValue({ sttToken: 'stt-token', ttsToken: 'tts-token' });
}

let ctx = null;

function TestConsumer() {
  ctx = useChatContext();
  return null;
}

function getContext() {
  return ctx;
}

async function renderWithContext(configOverrides = {}) {
  const config = { ...baseConfig, ...configOverrides };
  ctx = null;
  let result;
  await act(async () => {
    result = render(
      <ChatProvider config={config}>
        <TestConsumer />
      </ChatProvider>,
    );
  });
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  ctx = null;
  stubChatServiceDelegates();
  jest.spyOn(i18n, 'changeLanguage').mockImplementation(() => {});
  jest.spyOn(i18n, 't').mockImplementation((key) => key);
  jest.spyOn(i18n, 'on').mockImplementation(() => {});
  jest.spyOn(i18n, 'off').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ChatContext — connectOn: demand', () => {
  it('calls service.connect() when the chat opens in demand mode', async () => {
    await renderWithContext({ connectOn: 'demand' });
    const connectSpy = jest.spyOn(ctx.service, 'connect');

    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });

    expect(connectSpy).toHaveBeenCalledTimes(1);
    connectSpy.mockRestore();
  });

  it('does NOT call service.connect() when the chat opens in mount mode', async () => {
    await renderWithContext({ connectOn: 'mount' });
    const connectSpy = jest.spyOn(ctx.service, 'connect');

    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });

    expect(connectSpy).not.toHaveBeenCalled();
    connectSpy.mockRestore();
  });

  it('does NOT call service.connect() on mount even in demand mode', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    const connectSpy = jest.spyOn(WeniWebchatService.prototype, 'connect');

    await renderWithContext({ connectOn: 'demand' });
    expect(ctx.isChatOpen).toBe(false);
    expect(connectSpy).not.toHaveBeenCalled();
    connectSpy.mockRestore();
  });

  it('calls service.connect() again on reopen to handle reconnection', async () => {
    await renderWithContext({ connectOn: 'demand' });
    const connectSpy = jest.spyOn(ctx.service, 'connect');

    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });
    expect(connectSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      ctx.service.setIsChatOpen(false);
    });

    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });
    expect(connectSpy).toHaveBeenCalledTimes(2);

    connectSpy.mockRestore();
  });

  it('mount mode auto-connects during init', async () => {
    await renderWithContext({ connectOn: 'mount' });
    expect(ctx.service._connected).toBe(true);
  });

  it('demand mode does NOT auto-connect during init', async () => {
    await renderWithContext({ connectOn: 'demand' });
    expect(ctx.service._connected).toBe(false);
  });
});

describe('ChatContext — clearCart', () => {
  it('exposes clearCart on the context', async () => {
    await renderWithContext({});
    expect(typeof ctx.clearCart).toBe('function');
  });

  it('resets cart to empty object when called', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setCart({ 'product-1': { quantity: 2 } });
    });

    expect(ctx.cart).toEqual({ 'product-1': { quantity: 2 } });

    await act(async () => {
      ctx.clearCart();
    });

    expect(ctx.cart).toEqual({});
  });

  it('attaches clearCart to the service instance', async () => {
    await renderWithContext({});
    expect(typeof ctx.service.clearCart).toBe('function');
  });

  it('service.clearCart resets the cart state', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setCart({ 'product-1': { quantity: 3 } });
    });

    expect(ctx.cart).toEqual({ 'product-1': { quantity: 3 } });

    await act(async () => {
      ctx.service.clearCart();
    });

    expect(ctx.cart).toEqual({});
  });
});

describe('ChatContext — inputDraft', () => {
  it('exposes inputDraft with initial value ""', async () => {
    await renderWithContext({});
    expect(ctx.inputDraft).toBe('');
  });

  it('exposes setInputDraft as a function', async () => {
    await renderWithContext({});
    expect(typeof ctx.setInputDraft).toBe('function');
  });

  it('setInputDraft updates inputDraft', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setInputDraft('hello world');
    });

    expect(ctx.inputDraft).toBe('hello world');
  });

  it('inputDraft persists after setInputDraft is called multiple times', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setInputDraft('first');
    });
    await act(async () => {
      ctx.setInputDraft('second');
    });

    expect(ctx.inputDraft).toBe('second');
  });

  it('inputDraft can be cleared by setting it to ""', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setInputDraft('some text');
    });
    expect(ctx.inputDraft).toBe('some text');

    await act(async () => {
      ctx.setInputDraft('');
    });
    expect(ctx.inputDraft).toBe('');
  });

  it('inputDraft persists after isChatOpen toggle (chat close and reopen)', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setInputDraft('draft text');
    });
    expect(ctx.inputDraft).toBe('draft text');

    await act(async () => {
      ctx.service.setIsChatOpen(false);
    });
    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });

    expect(ctx.inputDraft).toBe('draft text');
  });

  it('inputDraft persists after catalog navigation (setCurrentPage + goBack)', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setInputDraft('catalog draft');
    });
    expect(ctx.inputDraft).toBe('catalog draft');

    await act(async () => {
      ctx.setCurrentPage({ view: 'product-catalog', props: {} });
    });
    expect(ctx.currentPage?.view).toBe('product-catalog');

    await act(async () => {
      ctx.goBack();
    });
    expect(ctx.currentPage).toBeNull();

    expect(ctx.inputDraft).toBe('catalog draft');
  });
});

describe('useChatContext', () => {
  it('throws when used outside a ChatProvider', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => renderHook(() => useChatContext())).toThrow(
      'useChatContext must be used within a ChatProvider',
    );

    consoleSpy.mockRestore();
  });
});

describe('ChatContext — embedded config', () => {
  it('forces fullscreen mode and hides close/fullscreen controls', async () => {
    await renderWithContext({ embedded: true });
    expect(ctx.isChatOpen).toBe(true);
    expect(ctx.isChatFullscreen).toBe(true);
  });
});

describe('ChatContext — page navigation', () => {
  it('setCurrentPage pushes a page onto history', async () => {
    await renderWithContext({});
    const page = { view: 'product-catalog', props: {} };
    await act(async () => {
      ctx.setCurrentPage(page);
    });

    expect(ctx.currentPage).toEqual(page);
    expect(ctx.pageHistory).toHaveLength(1);
  });

  it('setCurrentPage(null) clears page history', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setCurrentPage({ view: 'cart', props: {} });
    });
    await act(async () => {
      ctx.setCurrentPage(null);
    });

    expect(ctx.currentPage).toBeNull();
    expect(ctx.pageHistory).toEqual([]);
  });

  it('does not push duplicate consecutive pages', async () => {
    await renderWithContext({});
    const page = { view: 'product-catalog', props: {} };
    await act(async () => {
      getContext().setCurrentPage(page);
    });
    await act(async () => {
      getContext().setCurrentPage(page);
    });

    expect(getContext().pageHistory).toHaveLength(1);
  });

  it('goBack removes the last page', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setCurrentPage({ view: 'product-catalog', props: {} });
      ctx.setCurrentPage({ view: 'product-details', props: { id: '1' } });
    });
    await act(async () => {
      ctx.goBack();
    });

    expect(ctx.currentPage?.view).toBe('product-catalog');
    expect(ctx.pageHistory).toHaveLength(1);
  });

  it('goBack on a single page clears history', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setCurrentPage({ view: 'cart', props: {} });
    });
    await act(async () => {
      ctx.goBack();
    });

    expect(ctx.currentPage).toBeNull();
    expect(ctx.pageHistory).toEqual([]);
  });

  it('clearPageHistory resets navigation state', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setCurrentPage({ view: 'cart', props: {} });
    });
    await act(async () => {
      ctx.clearPageHistory();
    });

    expect(ctx.currentPage).toBeNull();
    expect(ctx.pageHistory).toEqual([]);
  });

  it('attaches clearPageHistory to the service instance', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setCurrentPage({ view: 'cart', props: {} });
      ctx.service.clearPageHistory();
    });

    expect(ctx.pageHistory).toEqual([]);
  });
});

describe('ChatContext — init behavior', () => {
  it('opens chat when startFullScreen is true', async () => {
    await renderWithContext({ startFullScreen: true });
    expect(ctx.isChatOpen).toBe(true);
    expect(ctx.isChatFullscreen).toBe(true);
    expect(ctx.service.getSession().isChatOpen).toBe(true);
  });

  it('syncs isChatOpen from session when not startFullScreen', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    jest.spyOn(WeniWebchatService.prototype, 'getSession').mockReturnValue({
      isChatOpen: true,
    });

    await renderWithContext({});
    expect(ctx.isChatOpen).toBe(true);
  });

  it('closes the chat when the service enters checkout', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    jest.spyOn(WeniWebchatService.prototype, 'getSession').mockReturnValue({
      isChatOpen: true,
    });

    await renderWithContext({});
    expect(ctx.isChatOpen).toBe(true);
    const setOpenSpy = jest.spyOn(ctx.service, 'setIsChatOpen');

    await act(async () => {
      ctx.service.emit('storefront:entered-checkout', { at: Date.now() });
    });

    expect(getContext().isChatOpen).toBe(false);
    expect(setOpenSpy).toHaveBeenCalledWith(false);
  });

  it('sends initPayload as a hidden message when there are no messages', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    const sendSpy = jest.spyOn(WeniWebchatService.prototype, 'sendMessage');

    await renderWithContext({ initPayload: 'start conversation' });

    expect(sendSpy).toHaveBeenCalledWith('start conversation', {
      hidden: true,
    });
    sendSpy.mockRestore();
  });

  it('does not send initPayload when non-persisted messages already exist', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    jest
      .spyOn(WeniWebchatService.prototype, 'getMessages')
      .mockReturnValue([
        { direction: 'incoming', text: 'cached', persisted: false },
      ]);
    const sendSpy = jest.spyOn(WeniWebchatService.prototype, 'sendMessage');

    await renderWithContext({ initPayload: 'start conversation' });

    expect(sendSpy).not.toHaveBeenCalled();
    sendSpy.mockRestore();
  });

  it('sets shouldRender from init result', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    jest
      .spyOn(WeniWebchatService.prototype, 'init')
      .mockResolvedValue({ shouldRender: false });

    await renderWithContext({});
    expect(ctx.shouldRender).toBe(false);
  });

  it('logs an error when init fails', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    const initError = new Error('init failed');
    jest
      .spyOn(WeniWebchatService.prototype, 'init')
      .mockRejectedValue(initError);
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await renderWithContext({});

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to initialize service:',
      initError,
    );
    consoleSpy.mockRestore();
  });
});

describe('ChatContext — tooltip on init', () => {
  it('simulates a received tooltip message after the configured delay', async () => {
    jest.useFakeTimers();
    const WeniWebchatService = require('@weni/webchat-service');
    const simulateSpy = jest.spyOn(
      WeniWebchatService.prototype,
      'simulateMessageReceived',
    );

    await renderWithContext({
      tooltipMessage: 'Need help?',
      tooltipDelay: 500,
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(simulateSpy).toHaveBeenCalledWith({
      type: 'message',
      message: { text: 'Need help?' },
    });
    expect(ctx.isWelcomeTooltip).toBe(true);
    simulateSpy.mockRestore();
  });

  it('does not show tooltip when messages already exist', async () => {
    jest.useFakeTimers();
    const WeniWebchatService = require('@weni/webchat-service');
    jest
      .spyOn(WeniWebchatService.prototype, 'getMessages')
      .mockReturnValue([{ direction: 'incoming', text: 'hello' }]);
    const simulateSpy = jest.spyOn(
      WeniWebchatService.prototype,
      'simulateMessageReceived',
    );

    await renderWithContext({
      tooltipMessage: 'Need help?',
      tooltipDelay: 500,
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(simulateSpy).not.toHaveBeenCalled();
    simulateSpy.mockRestore();
  });

  it('does not show tooltip when chat is already open', async () => {
    jest.useFakeTimers();
    const WeniWebchatService = require('@weni/webchat-service');
    const simulateSpy = jest.spyOn(
      WeniWebchatService.prototype,
      'simulateMessageReceived',
    );

    await renderWithContext({
      tooltipMessage: 'Need help?',
      tooltipDelay: 500,
      startFullScreen: true,
    });
    expect(ctx.isChatOpen).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(simulateSpy).not.toHaveBeenCalled();
    simulateSpy.mockRestore();
  });

  it('clears isWelcomeTooltip when a later message is received', async () => {
    jest.useFakeTimers();

    await renderWithContext({
      tooltipMessage: 'Need help?',
      tooltipDelay: 500,
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(ctx.isWelcomeTooltip).toBe(true);

    await act(async () => {
      ctx.service.simulateMessageReceived({
        type: 'message',
        message: { text: 'real reply' },
      });
    });
    expect(ctx.isWelcomeTooltip).toBe(false);
  });
});

describe('ChatContext — message:received', () => {
  it('increments unreadCount when chat is closed', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.service.simulateMessageReceived({
        type: 'message',
        message: { text: 'new message' },
      });
    });

    expect(ctx.unreadCount).toBe(1);
    expect(ctx.tooltipMessage).toEqual(
      expect.objectContaining({ text: 'new message' }),
    );
    expect(ctx.isWelcomeTooltip).toBe(false);
  });

  it('does not increment unreadCount when chat is open', async () => {
    await renderWithContext({ startFullScreen: true });
    await act(async () => {
      ctx.service.simulateMessageReceived({
        type: 'message',
        message: { text: 'new message' },
      });
    });

    expect(ctx.unreadCount).toBe(0);
    expect(ctx.tooltipMessage).toBeNull();
  });

  it('does not set tooltipMessage when tooltips are disabled', async () => {
    await renderWithContext({ disableTooltips: true });
    await act(async () => {
      ctx.service.simulateMessageReceived({
        type: 'message',
        message: { text: 'new message' },
      });
    });

    expect(ctx.unreadCount).toBe(1);
    expect(ctx.tooltipMessage).toBeNull();
  });

  it('calls navigateIfSameDomain with the message and config flag', async () => {
    await renderWithContext({ navigateIfSameDomain: true });
    await act(async () => {
      ctx.service.simulateMessageReceived({
        type: 'message',
        message: { text: 'https://example.test/page' },
      });
    });

    expect(navigateIfSameDomain).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'https://example.test/page' }),
      true,
    );
  });

  it('calls navigateIfSameDomain when a streamed message is finalized with text', async () => {
    // Real service: first delta emits message:received with text:'' (streaming);
    // later deltas / stream_end emit message:updated with the full text.
    // Navigation must run on the finalized text, not only on the empty receive.
    await renderWithContext({ navigateIfSameDomain: true });

    const checkoutUrl =
      'https://example.test/checkout/?orderFormId=6f09bf60f8b346cdb3d31ed4f5e1014f&sc=1';
    const fullText = `Você pode concluir por aqui:\n${checkoutUrl}`;

    await act(async () => {
      ctx.service.emit('message:received', {
        id: 'stream-1',
        type: 'text',
        text: '',
        status: 'streaming',
        direction: 'incoming',
      });
    });

    navigateIfSameDomain.mockClear();

    await act(async () => {
      ctx.service.emit('message:updated', 'stream-1', {
        text: fullText,
        status: 'delivered',
      });
    });

    expect(navigateIfSameDomain).toHaveBeenCalledWith(
      expect.objectContaining({ text: fullText }),
      true,
    );
  });
});

describe('ChatContext — service events', () => {
  it('updates messages and connection flags on state:changed', async () => {
    await renderWithContext({});
    const newState = {
      messages: [{ direction: 'incoming', text: 'hi', id: '1' }],
      connection: { status: 'closed' },
      isTyping: true,
      isThinking: true,
      error: { message: 'boom' },
    };

    await act(async () => {
      ctx.service.emit('state:changed', newState);
    });

    expect(ctx.messages).toEqual(newState.messages);
    expect(ctx.isConnected).toBe(false);
    expect(ctx.isConnectionClosed).toBe(true);
    expect(ctx.connectionStatus).toBe('closed');
    expect(ctx.isTyping).toBe(true);
    expect(ctx.isThinking).toBe(true);
    expect(ctx.error).toEqual({ message: 'boom' });
  });

  it('mirrors thinkingText from state.thinkingText on state:changed', async () => {
    await renderWithContext({});
    expect(ctx.thinkingText).toBeNull();

    await act(async () => {
      ctx.service.emit('state:changed', {
        isThinking: true,
        thinkingText: 'Looking up products',
        messages: [],
      });
    });

    expect(ctx.thinkingText).toBe('Looking up products');
  });

  it('clears thinkingText when the service state clears it', async () => {
    await renderWithContext({});

    await act(async () => {
      ctx.service.emit('state:changed', {
        isThinking: true,
        thinkingText: 'Looking up products',
        messages: [],
      });
    });
    expect(ctx.thinkingText).toBe('Looking up products');

    await act(async () => {
      ctx.service.emit('state:changed', {
        isThinking: false,
        thinkingText: null,
        messages: [],
      });
    });
    expect(ctx.thinkingText).toBeNull();
  });

  it('updates recording state from recording events', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.service.emit('recording:started');
    });
    expect(ctx.isRecording).toBe(true);

    await act(async () => {
      ctx.service.emit('recording:tick', 12);
    });
    expect(ctx.recordingDuration).toBe(12);

    await act(async () => {
      ctx.service.emit('recording:stopped');
    });
    expect(ctx.isRecording).toBe(false);

    await act(async () => {
      ctx.service.emit('recording:started');
      ctx.service.emit('recording:cancelled');
    });
    expect(ctx.isRecording).toBe(false);
  });

  it('updates camera state from camera events', async () => {
    await renderWithContext({});
    const stream = { id: 'stream-1' };
    const devices = [{ deviceId: 'cam-1' }];

    await act(async () => {
      ctx.service.emit('camera:stream:received', stream);
      ctx.service.emit('camera:recording:started');
      ctx.service.emit('camera:devices:changed', devices);
    });

    expect(ctx.cameraRecordingStream).toBe(stream);
    expect(ctx.isCameraRecording).toBe(true);
    expect(ctx.cameraDevices).toEqual(devices);

    await act(async () => {
      ctx.service.emit('camera:recording:stopped');
    });
    expect(ctx.isCameraRecording).toBe(false);
  });

  it('updates context on context:changed', async () => {
    await renderWithContext({});
    const nextContext = { flow: 'support', vars: { name: 'Ana' } };
    await act(async () => {
      ctx.service.emit('context:changed', nextContext);
    });

    expect(ctx.context).toEqual(nextContext);
  });

  it('syncs i18n and voice language on language:changed', async () => {
    await renderWithContext({
      voiceMode: { enabled: true, elevenLabs: { voiceId: 'v1' } },
    });
    await act(async () => {
      getContext().service.emit('voice:enabled');
    });
    await act(async () => {
      ctx.service.emit('language:changed', 'pt-BR');
    });

    expect(i18n.changeLanguage).toHaveBeenCalledWith('pt-BR');
    expect(ctx.service).toBeTruthy();
  });

  it('enables voice mode on the server when client voice mode is enabled', async () => {
    await renderWithContext({
      voiceMode: { enabled: true, elevenLabs: { voiceId: 'v1' } },
    });

    expect(getContext().isVoiceEnabledByServer).toBe(false);

    await act(async () => {
      getContext().service.emit('voice:enabled');
    });

    expect(getContext().isVoiceEnabledByServer).toBe(true);
  });

  it('syncs isChatOpen from chat:open:changed', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.service.emit('chat:open:changed', true);
    });

    expect(ctx.isChatOpen).toBe(true);
  });

  it('allows chat:open:changed open events after a checkout close', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.service.emit('storefront:entered-checkout', { at: 1 });
    });
    expect(ctx.isChatOpen).toBe(false);

    await act(async () => {
      ctx.service.emit('chat:open:changed', true);
    });

    expect(ctx.isChatOpen).toBe(true);
  });

  it('does not close the chat on a URL change the service did not report', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });
    const setOpenSpy = jest.spyOn(ctx.service, 'setIsChatOpen');
    setOpenSpy.mockClear();

    await act(async () => {
      history.pushState({}, '', '/checkout/#/payment');
    });

    expect(setOpenSpy).not.toHaveBeenCalledWith(false);
    expect(ctx.isChatOpen).toBe(true);
  });
});

describe('ChatContext — UI helpers', () => {
  it('toggles fullscreen state', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.toggleChatFullscreen();
    });
    expect(ctx.isChatFullscreen).toBe(true);

    await act(async () => {
      ctx.toggleChatFullscreen();
    });
    expect(ctx.isChatFullscreen).toBe(false);
  });

  it('clears tooltip message', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.service.simulateMessageReceived({
        type: 'message',
        message: { text: 'tooltip' },
      });
    });
    expect(ctx.tooltipMessage).toEqual(
      expect.objectContaining({ text: 'tooltip' }),
    );

    await act(async () => {
      ctx.clearTooltipMessage();
    });
    expect(ctx.tooltipMessage).toBeNull();
  });

  it('delegates setIsChatOpen to the service', async () => {
    await renderWithContext({});
    await act(async () => {
      ctx.setIsChatOpen(true);
    });

    expect(ctx.isChatOpen).toBe(true);
    expect(ctx.service.getSession().isChatOpen).toBe(true);
  });

  it('marks a VTEX store from the storefront snapshot', async () => {
    await renderWithContext({});
    expect(ctx.isInsideVTEXStore).toBe(false);

    await act(async () => {
      ctx.service.emit('storefront:changed', {
        account: 'storeaccount',
        isProductPage: false,
        isFastStore: false,
      });
    });

    expect(ctx.isInsideVTEXStore).toBe(true);
    expect(ctx.storefrontSnapshot.account).toBe('storeaccount');
  });
});

describe('ChatContext — service proxies', () => {
  it('forwards convenience methods to the service', async () => {
    await renderWithContext({});
    const file = new File(['data'], 'file.txt', { type: 'text/plain' });
    const spies = {
      connect: jest.spyOn(ctx.service, 'connect'),
      sendMessage: jest.spyOn(ctx.service, 'sendMessage'),
      addProductToCart: jest.spyOn(ctx.service, 'addProductToCart'),
      setCustomField: jest.spyOn(ctx.service, 'setCustomField'),
      addConversationStatus: jest.spyOn(ctx.service, 'addConversationStatus'),
      sendOrder: jest.spyOn(ctx.service, 'sendOrder'),
      sendAttachment: jest.spyOn(ctx.service, 'sendAttachment'),
      startRecording: jest.spyOn(ctx.service, 'startRecording'),
      stopRecording: jest.spyOn(ctx.service, 'stopRecording'),
      cancelRecording: jest.spyOn(ctx.service, 'cancelRecording'),
      hasAudioPermission: jest.spyOn(ctx.service, 'hasAudioPermission'),
      requestAudioPermission: jest.spyOn(ctx.service, 'requestAudioPermission'),
      hasCameraPermission: jest.spyOn(ctx.service, 'hasCameraPermission'),
      requestCameraPermission: jest.spyOn(
        ctx.service,
        'requestCameraPermission',
      ),
      startCameraRecording: jest.spyOn(ctx.service, 'startCameraRecording'),
      stopCameraRecording: jest.spyOn(ctx.service, 'stopCameraRecording'),
      switchToNextCameraDevice: jest.spyOn(
        ctx.service,
        'switchToNextCameraDevice',
      ),
    };

    ctx.connect();
    ctx.sendMessage('hello');
    ctx.addProductToCart({ sku: '1' });
    ctx.setCustomField('name', 'Ana');
    ctx.addConversationStatus('done', 'success');
    ctx.sendOrder([{ id: '1' }]);
    ctx.sendAttachment(file);
    ctx.startRecording();
    ctx.stopRecording();
    ctx.cancelRecording();
    ctx.hasAudioPermission();
    ctx.requestAudioPermission();
    ctx.hasCameraPermission();
    ctx.requestCameraPermission();
    ctx.startCameraRecording();
    ctx.stopCameraRecording();
    ctx.switchToNextCameraDevice();

    expect(spies.connect).toHaveBeenCalled();
    expect(spies.sendMessage).toHaveBeenCalledWith('hello', undefined);
    expect(spies.addProductToCart).toHaveBeenCalledWith({ sku: '1' });
    expect(spies.setCustomField).toHaveBeenCalledWith('name', 'Ana');
    expect(spies.addConversationStatus).toHaveBeenCalledWith('done', 'success');
    expect(spies.sendOrder).toHaveBeenCalledWith([{ id: '1' }]);
    expect(spies.sendAttachment).toHaveBeenCalledWith(file);
    expect(spies.startRecording).toHaveBeenCalled();
    expect(spies.stopRecording).toHaveBeenCalled();
    expect(spies.cancelRecording).toHaveBeenCalled();
    expect(spies.hasAudioPermission).toHaveBeenCalled();
    expect(spies.requestAudioPermission).toHaveBeenCalled();
    expect(spies.hasCameraPermission).toHaveBeenCalled();
    expect(spies.requestCameraPermission).toHaveBeenCalled();
    expect(spies.startCameraRecording).toHaveBeenCalled();
    expect(spies.stopCameraRecording).toHaveBeenCalled();
    expect(spies.switchToNextCameraDevice).toHaveBeenCalled();
  });

  it('stopAndSendAudio delegates to service.stopRecording', async () => {
    await renderWithContext({});
    const stopSpy = jest.spyOn(ctx.service, 'stopRecording');

    await act(async () => {
      await ctx.stopAndSendAudio();
    });

    expect(stopSpy).toHaveBeenCalled();
    stopSpy.mockRestore();
  });
});

describe('ChatContext — voice mode', () => {
  const voiceConfig = {
    voiceMode: { enabled: true },
  };

  beforeEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn() },
    });
  });

  async function renderVoiceContext() {
    await renderWithContext(voiceConfig);
    await act(async () => {
      getContext().service.emit('voice:enabled');
    });
    return getContext();
  }

  it('does not enter voice mode when the client has not enabled it', async () => {
    await renderWithContext({});
    const enter = jest.spyOn(ctx.service, 'enterVoiceSession');
    await act(async () => {
      await ctx.enterVoiceMode();
    });
    expect(enter).not.toHaveBeenCalled();
  });

  it('follows voice:state listening and speaking', async () => {
    const voice = await renderVoiceContext();
    await act(async () => {
      await voice.enterVoiceMode();
    });
    expect(getContext().isVoiceModeActive).toBe(true);
    expect(getContext().voiceModeState).toBe('listening');

    await act(async () => {
      voice.service.emit('voice:state', { state: 'speaking' });
    });
    expect(getContext().voiceModeState).toBe('speaking');
  });

  it('records a permission error from voice:error', async () => {
    const voice = await renderVoiceContext();
    await act(async () => {
      voice.service.emit('voice:error', { operation: 'permission' });
    });
    expect(getContext().voiceError).toEqual({ operation: 'permission' });
  });

  it('sends one message for a final transcript', async () => {
    const voice = await renderVoiceContext();
    const send = jest.spyOn(voice.service, 'sendMessage');
    await act(async () => {
      voice.service.emit('voice:transcript', { text: 'hello there', messageId: 'm1' });
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('hello there');
  });

  it('forwards incoming assistant text while voice mode is active', async () => {
    const voice = await renderVoiceContext();
    await act(async () => {
      await voice.enterVoiceMode();
    });
    const speak = jest.spyOn(voice.service, 'speakIncomingText');
    await act(async () => {
      voice.service.emit('state:changed', {
        messages: [{ id: 'a1', direction: 'incoming', text: 'Hi', status: 'delivered' }],
        connection: { status: 'connected' },
      });
    });
    expect(speak).toHaveBeenCalledWith('Hi', 'a1');
  });

  it('exits the service session', async () => {
    const voice = await renderVoiceContext();
    const exit = jest.spyOn(voice.service, 'exitVoiceSession');
    await act(async () => {
      voice.exitVoiceMode();
    });
    expect(exit).toHaveBeenCalled();
    expect(voice.isVoiceModeActive).toBe(false);
  });
});
