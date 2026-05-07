/* eslint-disable react/prop-types */
import { render, screen, fireEvent } from '@testing-library/react';
import { FSButton } from './FSButton';

jest.mock('./Icon', () => ({
  Icon: ({ name, size, className }) => (
    <span
      data-testid={`icon-${name}`}
      data-size={size}
      className={className}
    />
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderButton(props = {}) {
  const defaults = { children: 'Click me' };
  return render(
    <FSButton
      {...defaults}
      {...props}
    />,
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('FSButton — rendering', () => {
  it('renders children', () => {
    renderButton();
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('renders as a <button> element', () => {
    renderButton();
    expect(screen.getByRole('button').tagName).toBe('BUTTON');
  });

  it('applies a custom className', () => {
    renderButton({ className: 'my-class' });
    expect(screen.getByRole('button')).toHaveClass('my-class');
  });

  it('forwards extra props to the button element', () => {
    renderButton({ 'aria-label': 'Submit form' });
    expect(
      screen.getByRole('button', { name: 'Submit form' }),
    ).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    renderButton({ onClick });
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Variant / size / modifier classes
// ---------------------------------------------------------------------------

describe('FSButton — variant and size classes', () => {
  it.each(['primary', 'secondary', 'tertiary'])(
    'applies variant class "weni-fs-button--%s"',
    (variant) => {
      renderButton({ variant });
      expect(screen.getByRole('button')).toHaveClass(
        `weni-fs-button--${variant}`,
      );
    },
  );

  it.each(['small', 'medium', 'large'])(
    'applies size class "weni-fs-button--%s"',
    (size) => {
      renderButton({ size });
      expect(screen.getByRole('button')).toHaveClass(`weni-fs-button--${size}`);
    },
  );

  it('applies the rounded class when rounded is true', () => {
    renderButton({ rounded: true });
    expect(screen.getByRole('button')).toHaveClass('weni-fs-button--rounded');
  });

  it('does not apply the rounded class when rounded is false', () => {
    renderButton({ rounded: false });
    expect(screen.getByRole('button')).not.toHaveClass(
      'weni-fs-button--rounded',
    );
  });

  it('applies the hover-state class when hoverState is true', () => {
    renderButton({ hoverState: true });
    expect(screen.getByRole('button')).toHaveClass(
      'weni-fs-button--hover-state',
    );
  });

  it('does not apply the hover-state class when hoverState is false', () => {
    renderButton({ hoverState: false });
    expect(screen.getByRole('button')).not.toHaveClass(
      'weni-fs-button--hover-state',
    );
  });
});

// ---------------------------------------------------------------------------
// onlyIcon prop
// ---------------------------------------------------------------------------

describe('FSButton — onlyIcon', () => {
  it('adds the only-icon class when onlyIcon is true', () => {
    renderButton({ onlyIcon: true, icon: 'close' });
    expect(screen.getByRole('button')).toHaveClass('weni-fs-button--only-icon');
  });

  it('does not add the only-icon class when onlyIcon is false', () => {
    renderButton({ onlyIcon: false, icon: 'close' });
    expect(screen.getByRole('button')).not.toHaveClass(
      'weni-fs-button--only-icon',
    );
  });

  it('does not add the only-icon class by default', () => {
    renderButton({ icon: 'close' });
    expect(screen.getByRole('button')).not.toHaveClass(
      'weni-fs-button--only-icon',
    );
  });

  it('forces icon size to "medium" when onlyIcon is true, regardless of size prop', () => {
    renderButton({ onlyIcon: true, icon: 'close', size: 'small' });
    expect(screen.getByTestId('icon-close')).toHaveAttribute(
      'data-size',
      'medium',
    );
  });

  it('uses the size prop for icon size when onlyIcon is false', () => {
    renderButton({ onlyIcon: false, icon: 'close', size: 'small' });
    expect(screen.getByTestId('icon-close')).toHaveAttribute(
      'data-size',
      'small',
    );
  });

  it('uses the size prop for icon size when onlyIcon is not provided', () => {
    renderButton({ icon: 'close', size: 'large' });
    expect(screen.getByTestId('icon-close')).toHaveAttribute(
      'data-size',
      'large',
    );
  });
});

// ---------------------------------------------------------------------------
// Icon rendering
// ---------------------------------------------------------------------------

describe('FSButton — icon rendering', () => {
  it('renders the icon when icon prop is provided', () => {
    renderButton({ icon: 'close' });
    expect(screen.getByTestId('icon-close')).toBeInTheDocument();
  });

  it('does not render an icon when icon prop is empty', () => {
    renderButton({ icon: '' });
    expect(screen.queryByTestId(/^icon-/)).not.toBeInTheDocument();
  });

  it('does not render an icon when icon prop is not provided', () => {
    renderButton();
    expect(screen.queryByTestId(/^icon-/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('FSButton — loading state', () => {
  it('is disabled when isLoading is true', () => {
    renderButton({ isLoading: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows the loading spinner icon when isLoading is true', () => {
    renderButton({ isLoading: true });
    expect(screen.getByTestId('icon-progress_activity')).toBeInTheDocument();
    expect(screen.getByTestId('icon-progress_activity')).toHaveClass(
      'weni-fs-button__loading-spinner',
    );
  });

  it('does not show the regular icon when isLoading is true', () => {
    renderButton({ isLoading: true, icon: 'close' });
    expect(screen.queryByTestId('icon-close')).not.toBeInTheDocument();
  });

  it('is not disabled by default', () => {
    renderButton();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe('FSButton — disabled state', () => {
  it('is disabled when disabled prop is true', () => {
    renderButton({ disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is not disabled when disabled prop is false', () => {
    renderButton({ disabled: false });
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});
