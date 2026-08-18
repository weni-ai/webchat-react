import { render, screen, act } from '@testing-library/react';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('@/components/common/Icon', () => ({
  __esModule: true,
  default: ({ name }) => <span data-testid="thinking-icon">{name}</span>,
}));

import { ThinkingIndicator } from './ThinkingIndicator';

describe('ThinkingIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders the spinner and applies a custom className', () => {
    const { container } = render(<ThinkingIndicator className="extra" />);
    expect(container.querySelector('.weni-thinking-indicator')).toHaveClass(
      'extra',
    );
    expect(screen.getByTestId('thinking-icon')).toHaveTextContent(
      'progress_activity',
    );
  });

  it('starts with an initializing blank line', () => {
    render(<ThinkingIndicator />);
    expect(screen.getByText('\u00a0')).toBeInTheDocument();
  });

  it('shows the first message after the init animation', () => {
    render(<ThinkingIndicator />);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByText('thinking.messages.processing')).toBeInTheDocument();
  });

  it('slides to the next message after the random delay', () => {
    render(<ThinkingIndicator />);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByText('thinking.messages.processing')).toBeInTheDocument();
    expect(screen.getByText('thinking.messages.connecting')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByText('thinking.messages.connecting')).toBeInTheDocument();
  });

  it('stops scheduling after the last message', () => {
    render(<ThinkingIndicator />);
    act(() => {
      jest.advanceTimersByTime(500);
    });

    for (let i = 0; i < 4; i += 1) {
      act(() => {
        jest.advanceTimersByTime(4000);
        jest.advanceTimersByTime(500);
      });
    }

    expect(screen.getByText('thinking.messages.almost')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('thinking.messages.almost')).toBeInTheDocument();
  });

  it('clears pending timers on unmount', () => {
    const { unmount } = render(<ThinkingIndicator />);
    unmount();
    expect(() => {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }).not.toThrow();
  });
});
