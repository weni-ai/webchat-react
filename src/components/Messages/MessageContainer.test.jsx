import { render, screen } from '@testing-library/react';
import { MessageContainer } from './MessageContainer';

describe('MessageContainer', () => {
  it('renders authorName as text above children when provided', () => {
    render(
      <MessageContainer
        direction="incoming"
        type="text"
        authorName="Julia"
      >
        <span>Hello there</span>
      </MessageContainer>,
    );

    const nameEl = screen.getByText('Julia');
    expect(nameEl).toHaveClass('weni-message__author-name');
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('omits the authorName element when not provided', () => {
    const { container } = render(
      <MessageContainer
        direction="incoming"
        type="text"
      >
        <span>Hello there</span>
      </MessageContainer>,
    );

    expect(
      container.querySelector('.weni-message__author-name'),
    ).not.toBeInTheDocument();
  });
});
