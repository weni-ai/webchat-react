import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ListMessage } from './ListMessage';

const mockGoBack = jest.fn();
const mockSendMessage = jest.fn();
const mockUsePrefersReducedMotion = jest.fn(() => false);

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: () => ({
    goBack: mockGoBack,
    sendMessage: mockSendMessage,
  }),
}));

jest.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => mockUsePrefersReducedMotion(),
}));

describe('views/ListMessage', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockSendMessage.mockClear();
    mockUsePrefersReducedMotion.mockReturnValue(false);
  });

  it('applies 15ms stagger across 9 items (total 300ms) when animateEntrance is true', () => {
    const options = Array.from({ length: 9 }, (_, i) => `Deal ${i + 1}`);
    render(
      <ListMessage
        options={options}
        animateEntrance
      />,
    );

    const first = screen.getByRole('button', { name: 'Deal 1' });
    const ninth = screen.getByRole('button', { name: 'Deal 9' });

    expect(first).toHaveClass('weni-component-enter--pop');
    expect(first.style.getPropertyValue('--weni-enter-duration')).toBe('180ms');
    expect(first.style.getPropertyValue('--weni-enter-delay')).toBe('0ms');
    expect(ninth.style.getPropertyValue('--weni-enter-delay')).toBe('120ms');
  });

  it('animates a single item in 180ms with 0ms delay', () => {
    render(
      <ListMessage
        options={['Only option']}
        animateEntrance
      />,
    );

    const option = screen.getByRole('button', { name: 'Only option' });
    expect(option).toHaveClass('weni-component-enter--pop');
    expect(option.style.getPropertyValue('--weni-enter-duration')).toBe(
      '180ms',
    );
    expect(option.style.getPropertyValue('--weni-enter-delay')).toBe('0ms');
  });

  it('disables option animation under prefers-reduced-motion or when animateEntrance is false', () => {
    mockUsePrefersReducedMotion.mockReturnValue(true);
    const { rerender } = render(
      <ListMessage
        options={['A', 'B']}
        animateEntrance
      />,
    );
    expect(screen.getByRole('button', { name: 'A' })).not.toHaveClass(
      'weni-component-enter--pop',
    );

    mockUsePrefersReducedMotion.mockReturnValue(false);
    rerender(
      <ListMessage
        options={['A', 'B']}
        animateEntrance={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'A' })).not.toHaveClass(
      'weni-component-enter--pop',
    );
  });

  it('selects an option, sends once, closes view, and guards against double submit', async () => {
    const user = userEvent.setup();
    render(
      <ListMessage
        options={['Deal 1', 'Deal 2']}
        animateEntrance
      />,
    );

    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Deal 2' }));
    expect(sendButton).toBeEnabled();

    await user.click(sendButton);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith('Deal 2');
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(sendButton).toBeDisabled();

    await user.click(sendButton);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});
