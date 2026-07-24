import ReactDOM from 'react-dom/client';
import WebChat from '@/standalone';
import { service } from '@/contexts/ChatContext';
import i18n from '@/i18n';

const mockRender = jest.fn();
const mockUnmount = jest.fn();

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: mockRender,
    unmount: mockUnmount,
  })),
}));

jest.mock('@/utils/sendVtexUtm', () => ({
  sendVtexUtm: jest.fn(),
  UTM_SOURCES: {
    CONV_STARTER: 'cx_shopping_assistant_conv_starter',
    ASSISTANT: 'cx_shopping_assistant',
    CART: 'cx_shopping_assistant_cart',
  },
}));

jest.mock('@/components/Widget/Widget', () => jest.fn(() => null));

import { sendVtexUtm } from '@/utils/sendVtexUtm';

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: {
    changeLanguage: jest.fn(),
  },
}));

const baseParams = {
  selector: '#webchat-root',
  socketUrl: 'wss://example.test',
  channelUuid: '00000000-0000-0000-0000-000000000000',
  host: 'https://example.test',
};

function getWidgetPropsFromRender() {
  const strictModeElement = mockRender.mock.calls.at(-1)?.[0];
  return strictModeElement?.props?.children?.props;
}

function setupContainer(id = 'webchat-root') {
  const container = document.createElement('div');
  container.id = id;
  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  delete service.onReady;
  service.setIsChatOpen = jest.fn();
  service.getIsChatOpen = jest.fn().mockResolvedValue(false);
  service.sendMessage = jest.fn();
  service.addProductToCart = jest.fn();
  service.sendUtm = jest.fn();
  service.clearMessages = jest.fn();
  service.setSessionId = jest.fn();
  service.setContext = jest.fn();
  service.getContext = jest.fn().mockResolvedValue({ flow: 'support' });
  service.setCustomField = jest.fn();
  service.simulateMessageReceived = jest.fn();
  service.simulateMessageSent = jest.fn();
  service.emit = jest.fn();
  service.clearPageHistory = jest.fn();
  service.clearCart = jest.fn();
  WebChat.destroy();
});

afterEach(() => {
  WebChat.destroy();
  jest.restoreAllMocks();
});

describe('WebChat.init', () => {
  it('logs an error when selector is missing', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    WebChat.init({ ...baseParams, selector: undefined });

    expect(consoleSpy).toHaveBeenCalledWith('WebChat: selector is required');
    expect(ReactDOM.createRoot).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('logs an error when the selector does not match any element', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    WebChat.init(baseParams);

    expect(consoleSpy).toHaveBeenCalledWith(
      'WebChat: element not found for selector "#webchat-root"',
    );
    expect(ReactDOM.createRoot).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('renders the widget with mapped config defaults', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    setupContainer();

    WebChat.init(baseParams);

    expect(ReactDOM.createRoot).toHaveBeenCalled();
    expect(mockRender).toHaveBeenCalled();
    expect(getWidgetPropsFromRender()).toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          socketUrl: baseParams.socketUrl,
          channelUuid: baseParams.channelUuid,
          host: baseParams.host,
          connectOn: 'mount',
          title: 'Welcome',
          inputTextFieldHint: 'Type a message',
          position: 'bottom-right',
          showCloseButton: true,
          renderPercentage: 100,
        }),
        theme: null,
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith('WebChat initialized successfully');
    consoleSpy.mockRestore();
  });

  it('maps legacy params and omits undefined config values', () => {
    setupContainer();

    WebChat.init({
      ...baseParams,
      title: 'Support',
      connectOn: 'demand',
      showCloseButton: false,
      showFullScreenButton: true,
      params: { storage: 'session' },
      subtitle: undefined,
    });

    const { config, theme } = getWidgetPropsFromRender();
    expect(config).toEqual(
      expect.objectContaining({
        title: 'Support',
        connectOn: 'demand',
        storage: 'session',
        showCloseButton: false,
        showFullScreenButton: true,
      }),
    );
    expect(config).not.toHaveProperty('subtitle');
    expect(theme).toBeNull();
  });

  it('extracts theme props from params and customizeWidget', () => {
    setupContainer();

    WebChat.init({
      ...baseParams,
      customizeWidget: {
        titleColor: '#111111',
        launcherColor: '#222222',
      },
      mainColor: '#333333',
      widgetWidth: 400,
      unusedThemeProp: undefined,
    });

    const { theme } = getWidgetPropsFromRender();
    expect(theme).toEqual({
      titleColor: '#111111',
      launcherColor: '#222222',
      mainColor: '#333333',
      widgetWidth: 400,
    });
  });

  it('falls back launcherColor from mainColor and vice versa', () => {
    setupContainer();

    WebChat.init({
      ...baseParams,
      mainColor: '#abcdef',
    });

    expect(getWidgetPropsFromRender().theme).toEqual({
      launcherColor: '#abcdef',
      mainColor: '#abcdef',
    });

    WebChat.destroy();
    setupContainer();

    WebChat.init({
      ...baseParams,
      launcherColor: '#fedcba',
    });

    expect(getWidgetPropsFromRender().theme).toEqual({
      launcherColor: '#fedcba',
      mainColor: '#fedcba',
    });
  });

  it('logs an error when React fails to render', () => {
    setupContainer();
    const error = new Error('render failed');
    ReactDOM.createRoot.mockImplementationOnce(() => {
      throw error;
    });
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    WebChat.init(baseParams);

    expect(consoleSpy).toHaveBeenCalledWith(
      'WebChat: Failed to initialize',
      error,
    );
    consoleSpy.mockRestore();
  });
});

describe('WebChat.destroy', () => {
  it('unmounts the widget root', () => {
    setupContainer();
    WebChat.init(baseParams);

    WebChat.destroy();

    expect(mockUnmount).toHaveBeenCalled();
  });

  it('does nothing when init was never called', () => {
    WebChat.destroy();

    expect(mockUnmount).not.toHaveBeenCalled();
  });
});

describe('WebChat service helpers', () => {
  beforeEach(() => {
    setupContainer();
    WebChat.init(baseParams);
  });

  it('open sets the chat as open', async () => {
    await WebChat.open();

    expect(service.setIsChatOpen).toHaveBeenCalledWith(true);
  });

  it('close sets the chat as closed', async () => {
    await WebChat.close();

    expect(service.setIsChatOpen).toHaveBeenCalledWith(false);
  });

  it('toggle flips the current chat open state', async () => {
    service.getIsChatOpen.mockResolvedValue(true);

    await WebChat.toggle();

    expect(service.getIsChatOpen).toHaveBeenCalled();
    expect(service.setIsChatOpen).toHaveBeenCalledWith(false);
  });

  it('send forwards message and options to the service', async () => {
    await WebChat.send('hello', { hidden: true });

    expect(service.sendMessage).toHaveBeenCalledWith('hello', { hidden: true });
  });

  it('addProductToCart forwards props to the service', async () => {
    const props = { id: 'sku-1', seller: '1' };
    await WebChat.addProductToCart(props);

    expect(service.addProductToCart).toHaveBeenCalledWith(props);
  });

  it('sendUtm forwards utm_source to sendVtexUtm', async () => {
    await WebChat.sendUtm('cx_shopping_assistant', { once: false });

    expect(sendVtexUtm).toHaveBeenCalledWith(
      service,
      'cx_shopping_assistant',
      { once: false },
    );
  });

  it('clear clears messages, page history, and cart', async () => {
    await WebChat.clear();

    expect(service.clearMessages).toHaveBeenCalled();
    expect(service.clearPageHistory).toHaveBeenCalled();
    expect(service.clearCart).toHaveBeenCalled();
  });

  it('clear is a no-op for missing page history and cart helpers', async () => {
    delete service.clearPageHistory;
    delete service.clearCart;

    await expect(WebChat.clear()).resolves.toBeUndefined();
    expect(service.clearMessages).toHaveBeenCalled();
  });

  it('clearPageHistory calls the service helper when available', async () => {
    await WebChat.clearPageHistory();

    expect(service.clearPageHistory).toHaveBeenCalled();
  });

  it('clearPageHistory is a no-op when the service helper is missing', async () => {
    delete service.clearPageHistory;

    await expect(WebChat.clearPageHistory()).resolves.toBeUndefined();
  });

  it('clearCart calls the service helper when available', async () => {
    await WebChat.clearCart();

    expect(service.clearCart).toHaveBeenCalled();
  });

  it('clearCart is a no-op when the service helper is missing', async () => {
    delete service.clearCart;

    await expect(WebChat.clearCart()).resolves.toBeUndefined();
  });

  it('setSessionId forwards to the service', async () => {
    await WebChat.setSessionId('session-123');

    expect(service.setSessionId).toHaveBeenCalledWith('session-123');
  });

  it('setContext and getContext delegate to the service', async () => {
    const context = { name: 'Ana' };
    await WebChat.setContext(context);
    const result = await WebChat.getContext();

    expect(service.setContext).toHaveBeenCalledWith(context);
    expect(service.getContext).toHaveBeenCalled();
    expect(result).toEqual({ flow: 'support' });
  });

  it('setCustomField delegates to the service', async () => {
    await WebChat.setCustomField('email', 'ana@example.com');

    expect(service.setCustomField).toHaveBeenCalledWith(
      'email',
      'ana@example.com',
    );
  });

  it('isOpen returns the service chat open state', async () => {
    service.getIsChatOpen.mockResolvedValue(true);

    await expect(WebChat.isOpen()).resolves.toBe(true);
  });

  it('simulateMessageReceived and simulateMessageSent delegate to the service', async () => {
    const received = { type: 'message', message: { text: 'hi' } };
    const sent = { type: 'message', message: { text: 'bye' } };

    await WebChat.simulateMessageReceived(received);
    await WebChat.simulateMessageSent(sent);

    expect(service.simulateMessageReceived).toHaveBeenCalledWith(received);
    expect(service.simulateMessageSent).toHaveBeenCalledWith(sent);
  });

  it('waits for service.onReady when it is defined', async () => {
    const readyService = {
      setIsChatOpen: jest.fn(),
    };
    service.onReady = jest.fn().mockResolvedValue(readyService);

    await WebChat.open();

    expect(service.onReady).toHaveBeenCalled();
    expect(readyService.setIsChatOpen).toHaveBeenCalledWith(true);
  });

  it('uses the service directly when onReady is not defined', async () => {
    await WebChat.send('direct');

    expect(service.sendMessage).toHaveBeenCalledWith('direct', {});
  });
});

describe('WebChat.setConversationStarters', () => {
  it('rejects invalid input shapes', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await WebChat.setConversationStarters(null);
    await WebChat.setConversationStarters([]);
    await WebChat.setConversationStarters(['one', 'two', 'three', 'four']);
    await WebChat.setConversationStarters(['   ']);

    expect(service.emit).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns in development when input is invalid', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await WebChat.setConversationStarters([]);

    expect(warnSpy).toHaveBeenCalledWith(
      'WebChat.setConversationStarters: expected array of 1–3 non-empty strings',
    );

    process.env.NODE_ENV = originalNodeEnv;
    warnSpy.mockRestore();
  });

  it('returns early when the widget is not mounted and service.emit is unavailable', async () => {
    delete service.emit;

    await WebChat.setConversationStarters(['How can I help?']);

    expect(service.emit).toBeUndefined();
  });

  it('emits starters:set-manual for valid questions after init', async () => {
    setupContainer();
    WebChat.init(baseParams);

    await WebChat.setConversationStarters(['Track order', 'Talk to agent']);

    expect(service.emit).toHaveBeenCalledWith('starters:set-manual', [
      'Track order',
      'Talk to agent',
    ]);
  });
});

describe('WebChat.clearConversationStarters', () => {
  it('returns early when the widget is not mounted and service.emit is unavailable', async () => {
    delete service.emit;

    await WebChat.clearConversationStarters();

    expect(service.emit).toBeUndefined();
  });

  it('emits starters:clear after init', async () => {
    setupContainer();
    WebChat.init(baseParams);

    await WebChat.clearConversationStarters();

    expect(service.emit).toHaveBeenCalledWith('starters:clear');
  });
});

describe('WebChat utility methods', () => {
  it('isVisible warns that it is not implemented', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(WebChat.isVisible()).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      'WebChat.isVisible() - Not implemented yet',
    );

    warnSpy.mockRestore();
  });

  it('reload warns that it is not implemented', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    WebChat.reload();

    expect(warnSpy).toHaveBeenCalledWith(
      'WebChat.reload() - Not implemented yet',
    );

    warnSpy.mockRestore();
  });

  it('changeLanguage delegates to i18n', () => {
    WebChat.changeLanguage('pt-BR');

    expect(i18n.changeLanguage).toHaveBeenCalledWith('pt-BR');
  });
});

describe('WebChat exports', () => {
  it('exposes the API on WebChat.default', () => {
    expect(WebChat.default).toBe(WebChat);
  });

  it('exposes the API on window for script tag usage', () => {
    expect(window.WebChat.default.init).toBe(WebChat.init);
  });
});
