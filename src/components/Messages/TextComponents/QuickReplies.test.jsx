import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QuickReplies } from './QuickReplies';

const mockSendMessage = jest.fn();

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: () => ({
    sendMessage: mockSendMessage,
  }),
}));

describe('QuickReplies', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  it('renders string and object items, handles duplicate labels, and sends visible label once on click', async () => {
    const user = userEvent.setup();
    render(
      <QuickReplies
        quickReplies={[
          'Express · within 2h',
          { title: 'Pick up in store', payload: 'pickup_store' },
          'Express · within 2h',
        ]}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent('Express · within 2h');
    expect(buttons[1]).toHaveTextContent('Pick up in store');

    await user.click(buttons[1]);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith('Pick up in store');

    // Immediately locks all buttons against double submission (FR-023)
    buttons.forEach((btn) => expect(btn).toBeDisabled());
    await user.click(buttons[0]);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks when disabled', async () => {
    const user = userEvent.setup();
    render(
      <QuickReplies
        quickReplies={['Yes', 'No']}
        disabled
      />,
    );

    const yesButton = screen.getByRole('button', { name: 'Yes' });
    expect(yesButton).toBeDisabled();
    await user.click(yesButton);
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('applies pop-in animation class and stagger CSS variables when animate is true', () => {
    render(
      <QuickReplies
        quickReplies={['A', 'B', 'C']}
        animate
        staggerOffset={2}
        staggerMs={30}
        durationMs={180}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('weni-component-enter--pop');
    expect(buttons[0].style.getPropertyValue('--weni-enter-duration')).toBe(
      '180ms',
    );
    expect(buttons[0].style.getPropertyValue('--weni-enter-delay')).toBe(
      '60ms',
    );
    expect(buttons[1].style.getPropertyValue('--weni-enter-delay')).toBe(
      '90ms',
    );
    expect(buttons[2].style.getPropertyValue('--weni-enter-delay')).toBe(
      '120ms',
    );
  });

  it('omits entrance animation class when durationMs is 0 (reduced motion)', () => {
    render(
      <QuickReplies
        quickReplies={['A']}
        animate
        durationMs={0}
      />,
    );

    expect(screen.getByRole('button', { name: 'A' })).not.toHaveClass(
      'weni-component-enter--pop',
    );
  });
});
