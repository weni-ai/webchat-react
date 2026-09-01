import { act, fireEvent, render, screen } from '@testing-library/react';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === 'connection.reconnecting_in') {
        return `Connection lost. Reconnecting in ${options.seconds}s…`;
      }
      const map = {
        'connection.try_again': 'Try again',
        'connection.reconnecting': 'Reconnecting',
        'connection.restored': 'Connection restored',
      };
      return map[key] || key;
    },
  }),
}));

jest.mock('@/hooks/useWeniChat', () => ({ useWeniChat: jest.fn() }));

import { useWeniChat } from '@/hooks/useWeniChat';

function mockChat(overrides = {}) {
  useWeniChat.mockReturnValue({
    connectionStatus: 'connected',
    nextAttemptAt: null,
    reconnectNow: jest.fn(),
    isConnectionClosed: false,
    ...overrides,
  });
}

describe('ConnectionStatusBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing while connected without a prior outage', () => {
    mockChat({ connectionStatus: 'connected' });
    const { container } = render(<ConnectionStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing in preview mode even while reconnecting', () => {
    mockChat({
      mode: 'preview',
      connectionStatus: 'reconnecting',
      nextAttemptAt: 1_000_000 + 3500,
    });
    const { container } = render(<ConnectionStatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the countdown and Try again while waiting to reconnect', () => {
    const reconnectNow = jest.fn();
    mockChat({
      connectionStatus: 'reconnecting',
      nextAttemptAt: 1_000_000 + 3500,
      reconnectNow,
    });
    render(<ConnectionStatusBanner />);

    expect(
      screen.getByText('Connection lost. Reconnecting in 4s…'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reconnectNow).toHaveBeenCalledTimes(1);
  });

  it('shows reconnecting dots after the wait elapses', () => {
    mockChat({
      connectionStatus: 'reconnecting',
      nextAttemptAt: 1_000_000 + 500,
    });
    render(<ConnectionStatusBanner />);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText(/Reconnecting/)).toBeInTheDocument();
  });

  it('shows restored for 10 seconds after reconnecting', () => {
    mockChat({
      connectionStatus: 'reconnecting',
      nextAttemptAt: 1_000_000 + 100,
    });
    const { rerender } = render(<ConnectionStatusBanner />);

    mockChat({ connectionStatus: 'connected' });
    rerender(<ConnectionStatusBanner />);

    expect(screen.getByText('Connection restored')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(screen.queryByText('Connection restored')).not.toBeInTheDocument();
  });
});
