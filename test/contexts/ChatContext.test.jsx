import { render, act, renderHook } from '@testing-library/react';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext';
import { navigateIfSameDomain } from '@/experimental/navigateIfSameDomain';
import { getVtexAccount } from '@/utils/vtex';
import i18n from '@/i18n';
import { VoiceService } from '@/services/voice';
import { AudioCapture } from '@/services/voice/AudioCapture';

jest.mock('@/experimental/navigateIfSameDomain', () => ({
  navigateIfSameDomain: jest.fn(),
}));

jest.mock('@/utils/vtex', () => ({
  getVtexAccount: jest.fn(() => null),
}));

jest.mock('@/services/voice', () => {
  const MockVoiceService = jest.fn();
  MockVoiceService.isSupported = jest.fn(() => true);
  return { VoiceService: MockVoiceService };
});

jest.mock('@/services/voice/AudioCapture', () => ({
  AudioCapture: {
    checkPermission: jest.fn(() => Promise.resolve('granted')),
    requestPermission: jest.fn(() => Promise.resolve(true)),
    isSupported: jest.fn(() => true),
  },
}));

function createMockVoiceService() {
  const listeners = {};
  return {
    listeners,
    on(event, cb) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    off(event, cb) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((fn) => fn !== cb);
    },
    removeAllListeners() {
      Object.keys(listeners).forEach((key) => delete listeners[key]);
    },
    emit(event, ...args) {
      (listeners[event] || []).forEach((fn) => fn(...args));
    },
    init: jest.fn(() => Promise.resolve()),
    startSession: jest.fn(() => Promise.resolve()),
    endSession: jest.fn(),
    destroy: jest.fn(),
    setLanguage: jest.fn(),
    setMessageCallback: jest.fn(),
    processTextChunk: jest.fn(),
  };
}

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

function getLatestVoiceServiceInstance() {
  const { results } = VoiceService.mock;
  return results.length > 0 ? results[results.length - 1].value : null;
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
  VoiceService.mockImplementation(() => createMockVoiceService());
  VoiceService.isSupported.mockReturnValue(true);
  AudioCapture.checkPermission.mockResolvedValue('granted');
  AudioCapture.requestPermission.mockResolvedValue(true);
  getVtexAccount.mockReturnValue(null);
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
    expect(ctx.tooltipMessage).toBe('new message');
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
      'https://example.test/page',
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
    expect(ctx.isTyping).toBe(true);
    expect(ctx.isThinking).toBe(true);
    expect(ctx.error).toEqual({ message: 'boom' });
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
      await getContext().enterVoiceMode();
    });

    const voiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      voiceInstance.emit('session:started');
    });

    await act(async () => {
      ctx.service.emit('language:changed', 'pt-BR');
    });

    expect(i18n.changeLanguage).toHaveBeenCalledWith('pt-BR');
    expect(voiceInstance.setLanguage).toHaveBeenCalledWith('pt');
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
    expect(ctx.tooltipMessage).toBe('tooltip');

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

  it('detects VTEX store context via getVtexAccount', async () => {
    getVtexAccount.mockReturnValue('storeaccount');

    await renderWithContext({});
    expect(ctx.isInsideVTEXStore).toBe(true);
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
    expect(spies.sendMessage).toHaveBeenCalledWith('hello');
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
    voiceMode: {
      enabled: true,
      elevenLabs: { voiceId: 'voice-123' },
      texts: { title: 'Talk' },
    },
  };

  async function renderVoiceContext(overrides = {}) {
    await renderWithContext({ ...voiceConfig, ...overrides });
    await act(async () => {
      getContext().service.emit('voice:enabled');
    });
    return getContext();
  }

  it('does not enter voice mode when client voice mode is disabled', async () => {
    await renderWithContext({});
    await act(async () => {
      await ctx.enterVoiceMode();
    });

    expect(VoiceService).not.toHaveBeenCalled();
  });

  it('does not enter voice mode when server has not enabled voice', async () => {
    await renderWithContext(voiceConfig);
    await act(async () => {
      await ctx.enterVoiceMode();
    });

    expect(VoiceService).not.toHaveBeenCalled();
  });

  it('does not enter voice mode when voice is not supported', async () => {
    VoiceService.isSupported.mockReturnValue(false);
    const ctx = await renderVoiceContext();

    await act(async () => {
      await ctx.enterVoiceMode();
    });

    expect(VoiceService).not.toHaveBeenCalled();
  });

  it('initializes and starts a voice session when enabled', async () => {
    await renderVoiceContext();

    await act(async () => {
      await getContext().enterVoiceMode();
    });

    const voiceInstance = getLatestVoiceServiceInstance();
    expect(voiceInstance.init).toHaveBeenCalled();
    expect(voiceInstance.startSession).toHaveBeenCalled();
    expect(getContext().isEnteringVoiceMode).toBe(true);

    await act(async () => {
      voiceInstance.emit('session:started');
    });

    expect(getContext().isEnteringVoiceMode).toBe(false);
    expect(getContext().isVoiceModeActive).toBe(true);
  });

  it('forwards incoming message chunks to the active voice service', async () => {
    const ctx = await renderVoiceContext();

    await act(async () => {
      await ctx.enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      voiceInstance.emit('session:started');
    });

    await act(async () => {
      ctx.service.emit('state:changed', {
        messages: [
          {
            id: 'msg-1',
            direction: 'incoming',
            text: 'Hello',
            status: 'complete',
          },
        ],
      });
    });

    expect(voiceInstance.processTextChunk).toHaveBeenCalledWith('Hello', true);
  });

  it('streams partial incoming text until the message completes', async () => {
    const ctx = await renderVoiceContext();

    await act(async () => {
      await ctx.enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      voiceInstance.emit('session:started');
    });

    await act(async () => {
      ctx.service.emit('state:changed', {
        messages: [
          {
            id: 'msg-2',
            direction: 'incoming',
            text: 'Hel',
            status: 'streaming',
          },
        ],
      });
    });
    await act(async () => {
      ctx.service.emit('state:changed', {
        messages: [
          {
            id: 'msg-2',
            direction: 'incoming',
            text: 'Hello',
            status: 'complete',
          },
        ],
      });
    });

    expect(voiceInstance.processTextChunk).toHaveBeenNthCalledWith(
      1,
      'Hel',
      false,
    );
    expect(voiceInstance.processTextChunk).toHaveBeenNthCalledWith(
      2,
      'lo',
      true,
    );
  });

  it('updates partial transcript and clears it on commit', async () => {
    await renderVoiceContext();

    await act(async () => {
      await getContext().enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();

    await act(async () => {
      voiceInstance.emit('transcript:partial', { text: 'testing' });
    });
    expect(getContext().voicePartialTranscript).toBe('testing');

    await act(async () => {
      voiceInstance.emit('transcript:committed');
    });
    expect(getContext().voicePartialTranscript).toBe('');
  });

  it('sets voice error and clears entering state on voice service error', async () => {
    await renderVoiceContext();
    const voiceError = new Error('mic failed');

    await act(async () => {
      await getContext().enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();

    await act(async () => {
      voiceInstance.emit('error', voiceError);
    });

    expect(getContext().voiceError).toBe(voiceError);
    expect(getContext().isEnteringVoiceMode).toBe(false);
  });

  it('exits voice mode and cleans up on session end', async () => {
    const ctx = await renderVoiceContext();

    await act(async () => {
      await ctx.enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      voiceInstance.emit('session:started');
    });

    await act(async () => {
      ctx.exitVoiceMode();
      voiceInstance.emit('session:ended', { reason: 'user' });
    });

    expect(voiceInstance.endSession).toHaveBeenCalled();
    expect(ctx.isVoiceModeActive).toBe(false);
    expect(ctx.voiceError).toBeNull();
    expect(voiceInstance.destroy).toHaveBeenCalled();
  });

  it('retries voice mode after an error', async () => {
    const ctx = await renderVoiceContext();

    await act(async () => {
      await ctx.enterVoiceMode();
    });
    const firstVoiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      firstVoiceInstance.emit('session:started');
      firstVoiceInstance.emit('error', new Error('temporary'));
    });

    await act(async () => {
      await ctx.retryVoiceMode();
    });

    expect(VoiceService).toHaveBeenCalledTimes(2);
    expect(ctx.voiceError).toBeNull();
  });

  it('updates voice intent banner based on voice mode state', async () => {
    await renderVoiceContext();

    await act(async () => {
      await getContext().enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      voiceInstance.emit('session:started');
      voiceInstance.emit('state:changed', { state: 'speaking' });
    });

    expect(getContext().voiceIntentBanner).toBe(
      'voice_mode.intent_status_agent_speaking',
    );

    await act(async () => {
      voiceInstance.emit('state:changed', { state: 'processing' });
    });
    expect(getContext().voiceIntentBanner).toBe(
      'voice_mode.intent_status_transcribing',
    );
  });

  it('runs voice entry flow with granted microphone permission', async () => {
    await renderVoiceContext();

    await act(async () => {
      await getContext().runVoiceModeEntryFlow();
    });

    expect(getContext().isVoiceModePageActive).toBe(true);
    expect(getContext().voiceIntentBanner).toBe('voice_mode.connecting');
    expect(VoiceService).toHaveBeenCalled();
  });

  it('shows disabled banner when microphone permission is denied', async () => {
    AudioCapture.checkPermission.mockResolvedValue('denied');
    await renderVoiceContext();

    await act(async () => {
      await getContext().runVoiceModeEntryFlow();
    });

    expect(getContext().voiceIntentBanner).toBe(
      'voice_mode.microphone_disabled_in_browser',
    );
    expect(VoiceService).not.toHaveBeenCalled();
  });

  it('requests microphone permission when not yet granted', async () => {
    AudioCapture.checkPermission.mockResolvedValue('prompt');
    AudioCapture.requestPermission.mockResolvedValue(true);
    await renderVoiceContext();

    await act(async () => {
      await getContext().runVoiceModeEntryFlow();
    });

    expect(AudioCapture.requestPermission).toHaveBeenCalled();
    expect(getContext().voiceIntentBanner).toBe('voice_mode.connecting');
    expect(VoiceService).toHaveBeenCalled();
  });

  it('shows disabled banner when microphone permission request is rejected', async () => {
    AudioCapture.checkPermission.mockResolvedValue('prompt');
    AudioCapture.requestPermission.mockResolvedValue(false);
    await renderVoiceContext();

    await act(async () => {
      await getContext().runVoiceModeEntryFlow();
    });

    expect(getContext().voiceIntentBanner).toBe(
      'voice_mode.microphone_disabled_in_browser',
    );
    expect(VoiceService).not.toHaveBeenCalled();
  });

  it('exits voice mode when intent is triggered while active', async () => {
    await renderVoiceContext();

    await act(async () => {
      await getContext().enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      voiceInstance.emit('session:started');
    });

    await act(async () => {
      await getContext().handleVoiceModeIntent();
    });

    expect(voiceInstance.endSession).toHaveBeenCalled();
    expect(getContext().isVoiceModePageActive).toBe(false);
  });

  it('starts voice entry flow when intent is triggered while inactive', async () => {
    await renderVoiceContext();

    await act(async () => {
      await getContext().handleVoiceModeIntent();
    });

    expect(getContext().isVoiceModePageActive).toBe(true);
    expect(AudioCapture.checkPermission).toHaveBeenCalled();
  });

  it('closes the voice mode page and exits an active session', async () => {
    await renderVoiceContext();

    await act(async () => {
      await getContext().enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();
    await act(async () => {
      voiceInstance.emit('session:started');
    });

    await act(async () => {
      getContext().handleCloseVoiceModePage();
    });

    expect(voiceInstance.endSession).toHaveBeenCalled();
    expect(getContext().isVoiceModePageActive).toBe(false);
  });

  it('sends committed transcript messages through the service', async () => {
    const ctx = await renderVoiceContext();
    const sendSpy = jest.spyOn(ctx.service, 'sendMessage');

    await act(async () => {
      await ctx.enterVoiceMode();
    });
    const voiceInstance = getLatestVoiceServiceInstance();
    const messageCallback = voiceInstance.setMessageCallback.mock.calls[0][0];

    await act(async () => {
      messageCallback('voice message');
    });

    expect(sendSpy).toHaveBeenCalledWith('voice message');
    sendSpy.mockRestore();
  });
});

describe('ChatContext — cleanup', () => {
  it('disconnects and removes listeners on unmount', async () => {
    const WeniWebchatService = require('@weni/webchat-service');
    const disconnectSpy = jest.spyOn(
      WeniWebchatService.prototype,
      'disconnect',
    );
    const removeListenersSpy = jest.spyOn(
      WeniWebchatService.prototype,
      'removeAllListeners',
    );

    const { unmount } = await renderWithContext({});

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(removeListenersSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
    removeListenersSpy.mockRestore();
  });

  it('destroys an active voice service on unmount', async () => {
    const { unmount } = await renderWithContext({
      voiceMode: {
        enabled: true,
        elevenLabs: { voiceId: 'voice-123' },
      },
    });

    await act(async () => {
      getContext().service.emit('voice:enabled');
    });
    await act(async () => {
      await getContext().enterVoiceMode();
    });

    const voiceInstance = getLatestVoiceServiceInstance();
    expect(voiceInstance).not.toBeNull();

    unmount();

    expect(voiceInstance.destroy).toHaveBeenCalled();
  });
});
