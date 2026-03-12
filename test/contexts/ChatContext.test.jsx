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
