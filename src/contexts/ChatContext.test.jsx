import { act, render, screen } from '@testing-library/react';
import WeniWebchatService from '@weni/webchat-service';
import { ChatProvider, useChatContext } from './ChatContext';

function ContextInspector() {
  const ctx = useChatContext();
  return (
    <div>
      <span data-testid="feature">
        {String(ctx.isHumanSupportFeatureEnabled)}
      </span>
      <span data-testid="active">{String(ctx.isHumanSupportActive)}</span>
      <span data-testid="typing-author">
        {ctx.typingAuthor ? JSON.stringify(ctx.typingAuthor) : 'null'}
      </span>
      <span data-testid="unread">{ctx.unreadCount}</span>
      <span data-testid="tooltip">
        {ctx.tooltipMessage ? ctx.tooltipMessage.text : 'none'}
      </span>
    </div>
  );
}

describe('ChatContext — human support status state', () => {
  const baseConfig = {
    host: 'https://flows.weni.ai',
    channelUuid: 'ch-test',
    connectOn: 'manual',
    disableTooltips: false,
  };

  it('exposes feature flag, humanSupport.active, and typingAuthor from service state', async () => {
    render(
      <ChatProvider config={baseConfig}>
        <ContextInspector />
      </ChatProvider>,
    );

    expect(screen.getByTestId('feature')).toHaveTextContent('false');
    expect(screen.getByTestId('active')).toHaveTextContent('false');
    expect(screen.getByTestId('typing-author')).toHaveTextContent('null');

    const svc = WeniWebchatService.latest;

    await act(async () => {
      svc.setHumanSupportFeature(true);
      svc.setHumanSupportActive(true);
      svc.setTypingAuthor({ type: 'human_agent', name: 'Julia' }, true);
    });

    expect(screen.getByTestId('feature')).toHaveTextContent('true');
    expect(screen.getByTestId('active')).toHaveTextContent('true');
    expect(screen.getByTestId('typing-author')).toHaveTextContent(
      JSON.stringify({ type: 'human_agent', name: 'Julia' }),
    );
  });

  it('ignores human_support_event messages for closed-chat unread count and tooltip preview', async () => {
    render(
      <ChatProvider config={baseConfig}>
        <ContextInspector />
      </ChatProvider>,
    );

    const svc = WeniWebchatService.latest;

    await act(async () => {
      svc.setHumanSupportFeature(true);
      svc.emitHumanSupportEvent({
        eventId: '6f1d2c3b-4a59-5e6f-8a7b-9c0d1e2f3a4b',
        event: 'started',
        occurredAt: Date.now(),
      });
    });

    expect(screen.getByTestId('unread')).toHaveTextContent('0');
    expect(screen.getByTestId('tooltip')).toHaveTextContent('none');

    await act(async () => {
      svc.simulateMessageReceived({ text: 'Hello from Julia!' });
    });

    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    expect(screen.getByTestId('tooltip')).toHaveTextContent(
      'Hello from Julia!',
    );
  });
});
