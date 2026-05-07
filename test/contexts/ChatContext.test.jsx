import { render, act } from '@testing-library/react';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext';

const baseConfig = {
  socketUrl: 'wss://example.test',
  channelUuid: '00000000-0000-0000-0000-000000000000',
  host: 'https://example.test',
};

function TestConsumer({ onContext }) {
  const ctx = useChatContext();
  onContext(ctx);
  return null;
}

async function renderWithContext(configOverrides = {}, onContext = () => {}) {
  const config = { ...baseConfig, ...configOverrides };
  let result;
  await act(async () => {
    result = render(
      <ChatProvider config={config}>
        <TestConsumer onContext={onContext} />
      </ChatProvider>,
    );
  });
  return result;
}

describe('ChatContext — connectOn: demand', () => {
  it('calls service.connect() when the chat opens in demand mode', async () => {
    let ctx;
    await renderWithContext({ connectOn: 'demand' }, (c) => {
      ctx = c;
    });

    const connectSpy = jest.spyOn(ctx.service, 'connect');

    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });

    expect(connectSpy).toHaveBeenCalledTimes(1);
    connectSpy.mockRestore();
  });

  it('does NOT call service.connect() when the chat opens in mount mode', async () => {
    let ctx;
    await renderWithContext({ connectOn: 'mount' }, (c) => {
      ctx = c;
    });

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

    let ctx;
    await renderWithContext({ connectOn: 'demand' }, (c) => {
      ctx = c;
    });

    expect(ctx.isChatOpen).toBe(false);
    expect(connectSpy).not.toHaveBeenCalled();
    connectSpy.mockRestore();
  });

  it('calls service.connect() again on reopen to handle reconnection', async () => {
    let ctx;
    await renderWithContext({ connectOn: 'demand' }, (c) => {
      ctx = c;
    });

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
    let ctx;
    await renderWithContext({ connectOn: 'mount' }, (c) => {
      ctx = c;
    });

    expect(ctx.service._connected).toBe(true);
  });

  it('demand mode does NOT auto-connect during init', async () => {
    let ctx;
    await renderWithContext({ connectOn: 'demand' }, (c) => {
      ctx = c;
    });

    expect(ctx.service._connected).toBe(false);
  });
});

describe('ChatContext — clearCart', () => {
  it('exposes clearCart on the context', async () => {
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

    expect(typeof ctx.clearCart).toBe('function');
  });

  it('resets cart to empty object when called', async () => {
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

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
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

    expect(typeof ctx.service.clearCart).toBe('function');
  });

  it('service.clearCart resets the cart state', async () => {
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

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
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

    expect(ctx.inputDraft).toBe('');
  });

  it('exposes setInputDraft as a function', async () => {
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

    expect(typeof ctx.setInputDraft).toBe('function');
  });

  it('setInputDraft updates inputDraft', async () => {
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

    await act(async () => {
      ctx.setInputDraft('hello world');
    });

    expect(ctx.inputDraft).toBe('hello world');
  });

  it('inputDraft persists after setInputDraft is called multiple times', async () => {
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

    await act(async () => {
      ctx.setInputDraft('first');
    });
    await act(async () => {
      ctx.setInputDraft('second');
    });

    expect(ctx.inputDraft).toBe('second');
  });

  it('inputDraft can be cleared by setting it to ""', async () => {
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

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
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

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
    let ctx;
    await renderWithContext({}, (c) => {
      ctx = c;
    });

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
