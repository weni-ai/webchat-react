/* eslint-disable react/prop-types */
import { render, screen, fireEvent } from '@testing-library/react';
import { Notification } from './Notification';

jest.mock('../Messages/MessagesList', () => ({
  Message: ({ message }) => <span data-testid="message">{message.text}</span>,
}));

jest.mock('@/components/common/FSButton', () => ({
  FSButton: ({ children, onClick, className, 'aria-label': ariaLabel }) => (
    <button
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

jest.mock('../common/Icon', () => ({
  __esModule: true,
  default: ({ name }) => <span data-testid={`icon-${name}`} />,
}));

function buildMessage(overrides = {}) {
  return {
    id: 'msg-1',
    type: 'text',
    text: 'Hello! How can I help you today?',
    ...overrides,
  };
}

describe('Notification — rendering', () => {
  it('renders the message content', () => {
    render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId('message')).toBeInTheDocument();
    expect(
      screen.getByText('Hello! How can I help you today?'),
    ).toBeInTheDocument();
  });

  it('renders the close button with correct aria-label', () => {
    render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Close notification' }),
    ).toBeInTheDocument();
  });

  it('renders the close icon inside the close button', () => {
    render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByTestId('icon-close')).toBeInTheDocument();
  });

  it('content area has role="button" and is keyboard focusable', () => {
    const { container } = render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
      />,
    );

    const content = container.querySelector('.weni-notification__content');
    expect(content).toHaveAttribute('role', 'button');
    expect(content).toHaveAttribute('tabindex', '0');
  });
});

describe('Notification — close button', () => {
  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <Notification
        message={buildMessage()}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close notification' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onOpen when the close button is clicked', () => {
    const onClose = jest.fn();
    const onOpen = jest.fn();
    render(
      <Notification
        message={buildMessage()}
        onClose={onClose}
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close notification' }));
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('Notification — content area opens webchat', () => {
  it('calls onOpen when the content area is clicked', () => {
    const onOpen = jest.fn();
    render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
        onOpen={onOpen}
      />,
    );

    fireEvent.click(screen.getByTestId('message'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen when Enter is pressed on the content area', () => {
    const onOpen = jest.fn();
    const { container } = render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
        onOpen={onOpen}
      />,
    );

    const content = container.querySelector('.weni-notification__content');
    fireEvent.keyDown(content, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not call onOpen when a key other than Enter is pressed', () => {
    const onOpen = jest.fn();
    const { container } = render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
        onOpen={onOpen}
      />,
    );

    const content = container.querySelector('.weni-notification__content');
    fireEvent.keyDown(content, { key: 'Space' });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not crash when onOpen is not provided and content is clicked', () => {
    render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
      />,
    );

    expect(() => fireEvent.click(screen.getByTestId('message'))).not.toThrow();
  });

  it('does not crash when onOpen is not provided and Enter is pressed', () => {
    const { container } = render(
      <Notification
        message={buildMessage()}
        onClose={jest.fn()}
      />,
    );

    const content = container.querySelector('.weni-notification__content');
    expect(() => fireEvent.keyDown(content, { key: 'Enter' })).not.toThrow();
  });
});
