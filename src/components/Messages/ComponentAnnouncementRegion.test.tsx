import { act, render } from '@testing-library/react';
import { ComponentAnnouncementRegion } from './ComponentAnnouncementRegion';

describe('ComponentAnnouncementRegion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a polite sr-only status region and dispatches multi-component announcements sequentially without moving focus', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const { container, rerender } = render(
      <ComponentAnnouncementRegion announcements={[]} />,
    );

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toHaveTextContent('');

    rerender(
      <ComponentAnnouncementRegion
        announcements={[
          { id: 'm1-1', text: 'List with 9 options available' },
          { id: 'm1-2', text: 'Track order link available' },
          { id: 'm1-3', text: '3 options available' },
        ]}
      />,
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(liveRegion).toHaveTextContent('List with 9 options available');

    act(() => {
      jest.advanceTimersByTime(60);
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(liveRegion).toHaveTextContent('Track order link available');

    act(() => {
      jest.advanceTimersByTime(60);
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(liveRegion).toHaveTextContent('3 options available');
    expect(document.activeElement).toBe(input);

    document.body.removeChild(input);
  });

  it('cleans up pending timers on unmount', () => {
    const { unmount } = render(
      <ComponentAnnouncementRegion
        announcements={[
          { id: 'm2-1', text: 'First' },
          { id: 'm2-2', text: 'Second' },
        ]}
      />,
    );

    unmount();
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(200);
      });
    }).not.toThrow();
  });
});
