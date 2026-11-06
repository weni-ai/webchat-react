import { render, screen, act } from '@testing-library/react';
import Widget from './Widget';
import WeniWebchatService from '@weni/webchat-service';

function latestService() {
  return globalThis.__webchatServiceLatest;
}

const mockStarters = {
  questions: [],
  isCompactVisible: false,
  isHiding: false,
  isLoading: false,
  hasShownCompactStarters: false,
  handleCompactStarterClick: jest.fn(),
  clearStarters: jest.fn(),
  isOptInBalloonVisible: false,
  couponPercent: null,
  handleWhatsappOffersClick: jest.fn(),
  dismissWhatsappOffersBalloon: jest.fn(),
  isBackInStockNotify: false,
};

jest.mock('@/contexts/ConversationStartersContext', () => ({
  ConversationStartersProvider: ({ children }) => children,
  useConversationStarters: () => mockStarters,
}));

const baseConfig = {
  socketUrl: 'wss://example.test',
  channelUuid: '00000000-0000-0000-0000-000000000000',
  host: 'https://example.test',
};

describe('Widget', () => {
  beforeEach(() => {
    mockStarters.isBackInStockNotify = false;
    mockStarters.isOptInBalloonVisible = false;
    mockStarters.questions = [];
    mockStarters.isCompactVisible = false;
    WeniWebchatService.connectCalls = 0;
    WeniWebchatService.sendCalls = 0;
    WeniWebchatService.simulatedCalls = 0;
    globalThis.__webchatServiceLatest = undefined;
  });

  it('renders the widget container', () => {
    render(<Widget config={baseConfig} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget');
  });

  it('applies weni-widget--bottom-right class by default', () => {
    render(<Widget config={baseConfig} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget--bottom-right');
  });

  it('applies weni-widget--bottom-right class when position is bottom-right', () => {
    render(<Widget config={{ ...baseConfig, position: 'bottom-right' }} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget--bottom-right');
    expect(widget).not.toHaveClass('weni-widget--bottom-left');
  });

  it('applies weni-widget--bottom-left class when position is bottom-left', () => {
    render(<Widget config={{ ...baseConfig, position: 'bottom-left' }} />);
    const widget = screen.getByRole('complementary', { hidden: true });
    expect(widget).toHaveClass('weni-widget--bottom-left');
    expect(widget).not.toHaveClass('weni-widget--bottom-right');
  });

  it('stays hidden and does not connect when the assistant is disabled', () => {
    jest.useFakeTimers();
    render(
      <Widget
        config={{
          host: 'https://example.test',
          shoppingAssistantDisabled: true,
          initPayload: 'hello',
          tooltipMessage: 'Need help?',
          startFullScreen: true,
        }}
      />,
    );

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    const service = latestService();
    expect(service.config.socketUrl).toBe(
      'wss://shopping-assistant-disabled.invalid',
    );
    expect(service.config.channelUuid).toBe('shopping-assistant-disabled');
    expect(service.config.connectOn).toBe('manual');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(service.constructor.connectCalls || 0).toBe(0);
    expect(service.constructor.sendCalls || 0).toBe(0);
    expect(service.constructor.simulatedCalls || 0).toBe(0);
    jest.useRealTimers();
  });

  it('shows the back-in-stock bubble without the opt-in balloon', () => {
    mockStarters.isBackInStockNotify = true;
    mockStarters.isOptInBalloonVisible = true;
    mockStarters.questions = ['Notify me when back in stock'];
    mockStarters.isCompactVisible = true;

    render(
      <Widget
        config={{
          ...baseConfig,
          shoppingAssistantDisabled: true,
        }}
      />,
    );

    expect(
      screen.getByText('Notify me when back in stock'),
    ).toBeInTheDocument();
    expect(document.querySelector('.weni-launcher')).toBeInTheDocument();
    expect(
      document.querySelector('.weni-opt-in-balloon'),
    ).not.toBeInTheDocument();
  });
});
