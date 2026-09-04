/* eslint-disable react/prop-types */
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/common/Icon', () => ({
  Icon: ({
    name,
    role,
    'aria-label': ariaLabel,
    className,
    style,
    _filled,
    _size,
    _color,
    ...rest
  }) => (
    <span
      data-testid="avatar-fallback-icon"
      role={role}
      aria-label={ariaLabel}
      className={className}
      style={style}
      {...rest}
    >
      {name}
    </span>
  ),
}));

import { Avatar, DEFAULT_AVATAR_ACCESSIBLE_NAME } from './Avatar';

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
    expect(
      screen.getByRole('img', { name: DEFAULT_AVATAR_ACCESSIBLE_NAME }),
    ).toBeInTheDocument();
  });

  it('renders an image when src is provided', () => {
    render(
      <Avatar
        src="https://example.com/a.png"
        alt="Jane"
      />,
    );
    expect(screen.getByRole('img', { name: 'Jane' })).toHaveAttribute(
      'src',
      'https://example.com/a.png',
    );
  });

  it('switches to the fallback and calls onError when the image fails', () => {
    const onError = jest.fn();
    render(
      <Avatar
        src="https://example.com/broken.png"
        alt="Broken"
        onError={onError}
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Broken' }));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('avatar-fallback-icon')).toBeInTheDocument();
  });

  it('does not throw when the image fails and onError is omitted', () => {
    render(
      <Avatar
        src="https://example.com/broken.png"
        alt="Broken"
      />,
    );

    expect(() => {
      fireEvent.error(screen.getByRole('img', { name: 'Broken' }));
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
    const avatar = screen.getByRole('img', {
      name: DEFAULT_AVATAR_ACCESSIBLE_NAME,
    });
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

  it('uses the default alt when image alt is empty', () => {
    render(
      <Avatar
        src="https://example.com/a.png"
        alt=""
      />,
    );
    expect(
      screen.getByRole('img', { name: DEFAULT_AVATAR_ACCESSIBLE_NAME }),
    ).toHaveAttribute('alt', DEFAULT_AVATAR_ACCESSIBLE_NAME);
  });
});
