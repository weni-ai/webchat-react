import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/common/Icon', () => ({
  Icon: ({ name }) => <span data-testid="avatar-fallback-icon">{name}</span>,
}));

import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders a fallback icon when src is empty', () => {
    render(<Avatar alt="Guest" />);
    expect(screen.getByRole('img', { name: 'Guest' })).toBeInTheDocument();
    expect(screen.getByTestId('avatar-fallback-icon')).toHaveTextContent(
      'rounded_x',
    );
    expect(screen.queryByRole('presentation')).not.toBeInTheDocument();
  });

  it('uses a default aria-label when alt is omitted', () => {
    render(<Avatar />);
    expect(screen.getByRole('img', { name: 'Avatar' })).toBeInTheDocument();
  });

  it('renders an image when src is provided', () => {
    const { container } = render(
      <Avatar
        src="https://example.com/a.png"
        alt="Jane"
      />,
    );
    expect(container.querySelector('.weni-avatar__image')).toHaveAttribute(
      'src',
      'https://example.com/a.png',
    );
  });

  it('switches to the fallback and calls onError when the image fails', () => {
    const onError = jest.fn();
    const { container } = render(
      <Avatar
        src="https://example.com/broken.png"
        alt="Broken"
        onError={onError}
      />,
    );

    fireEvent.error(container.querySelector('.weni-avatar__image'));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('avatar-fallback-icon')).toBeInTheDocument();
  });

  it('does not throw when the image fails and onError is omitted', () => {
    const { container } = render(
      <Avatar
        src="https://example.com/broken.png"
        alt="Broken"
      />,
    );

    expect(() => {
      fireEvent.error(container.querySelector('.weni-avatar__image'));
    }).not.toThrow();
  });

  it('applies size, shape, and className for string sizes', () => {
    render(
      <Avatar
        size="large"
        shape="square"
        className="extra"
      />,
    );
    const avatar = screen.getByRole('img', { name: 'Avatar' });
    expect(avatar).toHaveClass(
      'weni-avatar',
      'weni-avatar--large',
      'weni-avatar--square',
      'weni-avatar--with-background-color',
      'extra',
    );
  });

  it('applies inline dimensions for numeric sizes', () => {
    render(
      <Avatar
        size={80}
        alt="Sized"
      />,
    );
    const avatar = screen.getByRole('img', { name: 'Sized' });
    expect(avatar).toHaveStyle({ width: '80px', height: '80px' });
    expect(avatar.className).not.toMatch(/weni-avatar--\d/);
  });

  it('forwards extra props to the root', () => {
    render(
      <Avatar
        data-testid="avatar-root"
        title="hint"
      />,
    );
    expect(screen.getByTestId('avatar-root')).toHaveAttribute('title', 'hint');
  });

  it('falls back to the window name when image alt is empty', () => {
    const { container } = render(
      <Avatar
        src="https://example.com/a.png"
        alt=""
      />,
    );
    expect(container.querySelector('.weni-avatar__image')).toHaveAttribute(
      'alt',
      window.name,
    );
  });
});
