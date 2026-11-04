import { render, act } from '@testing-library/react';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext';

const baseConfig = {
  socketUrl: 'wss://example.test',
  channelUuid: '00000000-0000-0000-0000-000000000000',
  host: 'https://example.test',
};

let ctx = null;

function TestConsumer() {
  ctx = useChatContext();
  return null;
}

describe('ChatContext checkout close', () => {
  it('closes the chat on storefront:entered-checkout', async () => {
    await act(async () => {
      render(
        <ChatProvider config={baseConfig}>
          <TestConsumer />
        </ChatProvider>,
      );
    });

    await act(async () => {
      ctx.service.setIsChatOpen(true);
    });
    expect(ctx.isChatOpen).toBe(true);

    await act(async () => {
      ctx.service.emit('storefront:entered-checkout', { at: 1 });
    });

    expect(ctx.isChatOpen).toBe(false);
  });
});
