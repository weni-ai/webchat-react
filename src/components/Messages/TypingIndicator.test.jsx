import { render, screen } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('renders dot-only layout when label is omitted', () => {
    const { container } = render(<TypingIndicator />);
    expect(
      container.querySelectorAll('.weni-typing-indicator__dot'),
    ).toHaveLength(3);
    expect(
      container.querySelector('.weni-typing-indicator--with-label'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('.weni-typing-indicator__label'),
    ).not.toBeInTheDocument();
  });

  it('renders horizontal bubble + label layout when label is provided', () => {
    const { container } = render(<TypingIndicator label="Julia is typing" />);
    expect(
      container.querySelector('.weni-typing-indicator--with-label'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('.weni-typing-indicator__bubble'),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('.weni-typing-indicator__dot'),
    ).toHaveLength(3);
    expect(screen.getByText('Julia is typing')).toHaveClass(
      'weni-typing-indicator__label',
    );
  });
});
