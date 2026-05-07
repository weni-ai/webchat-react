import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

function renderTooltip(props = {}) {
  const defaults = {
    label: 'Tooltip label',
    children: <button type="button">Trigger</button>,
  };
  return render(
    <Tooltip
      {...defaults}
      {...props}
    />,
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('Tooltip — rendering', () => {
  it('renders the trigger child', () => {
    renderTooltip();
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
  });

  it('does not render the tooltip bubble on initial mount', () => {
    renderTooltip();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('applies a custom className to the wrapper', () => {
    const { container } = renderTooltip({ className: 'my-class' });
    expect(container.firstChild).toHaveClass(
      'weni-tooltip-trigger',
      'my-class',
    );
  });

  it('returns children as-is when children is not a valid React element', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <Tooltip label="Label">not an element</Tooltip>,
    );
    expect(container).toHaveTextContent('not an element');
    expect(
      container.querySelector('.weni-tooltip-trigger'),
    ).not.toBeInTheDocument();
    console.error.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Show on hover
// ---------------------------------------------------------------------------

describe('Tooltip — show on hover', () => {
  it('shows the tooltip bubble on mouseenter', () => {
    renderTooltip();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip label');
  });

  it('hides the tooltip bubble on mouseleave', () => {
    renderTooltip();
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('preserves the original onMouseEnter handler of the child', () => {
    const onMouseEnter = jest.fn();
    renderTooltip({
      children: (
        <button
          type="button"
          onMouseEnter={onMouseEnter}
        >
          Trigger
        </button>
      ),
    });
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });

  it('preserves the original onMouseLeave handler of the child', () => {
    const onMouseLeave = jest.fn();
    renderTooltip({
      children: (
        <button
          type="button"
          onMouseLeave={onMouseLeave}
        >
          Trigger
        </button>
      ),
    });
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Show on focus
// ---------------------------------------------------------------------------

describe('Tooltip — show on focus', () => {
  it('shows the tooltip bubble on focus', () => {
    renderTooltip();
    fireEvent.focus(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides the tooltip bubble on blur', () => {
    renderTooltip();
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.focus(trigger);
    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('preserves the original onFocus handler of the child', () => {
    const onFocus = jest.fn();
    renderTooltip({
      children: (
        <button
          type="button"
          onFocus={onFocus}
        >
          Trigger
        </button>
      ),
    });
    fireEvent.focus(screen.getByRole('button', { name: 'Trigger' }));
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('preserves the original onBlur handler of the child', () => {
    const onBlur = jest.fn();
    renderTooltip({
      children: (
        <button
          type="button"
          onBlur={onBlur}
        >
          Trigger
        </button>
      ),
    });
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.focus(trigger);
    fireEvent.blur(trigger);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// disabled prop
// ---------------------------------------------------------------------------

describe('Tooltip — disabled', () => {
  it('does not show the bubble on mouseenter when disabled', () => {
    renderTooltip({ disabled: true });
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show the bubble on focus when disabled', () => {
    renderTooltip({ disabled: true });
    fireEvent.focus(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides an already-visible bubble when disabled becomes true', () => {
    const { rerender } = renderTooltip({ disabled: false });
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    rerender(
      <Tooltip
        label="Tooltip label"
        disabled
      >
        <button type="button">Trigger</button>
      </Tooltip>,
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// aria-describedby linking
// ---------------------------------------------------------------------------

describe('Tooltip — aria-describedby', () => {
  it('sets aria-describedby on the trigger linking it to the bubble when visible', () => {
    renderTooltip();
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.mouseEnter(trigger);

    const bubble = screen.getByRole('tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', bubble.id);
  });

  it('removes aria-describedby from the trigger when the bubble hides', () => {
    renderTooltip();
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('does not set aria-describedby when disabled and hovered', () => {
    renderTooltip({ disabled: true });
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.mouseEnter(trigger);
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });
});

// ---------------------------------------------------------------------------
// Bubble content
// ---------------------------------------------------------------------------

describe('Tooltip — bubble content', () => {
  it('renders a string label inside the bubble', () => {
    renderTooltip({ label: 'Save changes' });
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Save changes');
  });

  it('renders a React node as the label', () => {
    renderTooltip({ label: <strong>Bold label</strong> });
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(
      screen.getByRole('tooltip').querySelector('strong'),
    ).toBeInTheDocument();
  });

  it('bubble has role="tooltip"', () => {
    renderTooltip();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('bubble has the CSS class weni-tooltip-trigger__bubble', () => {
    renderTooltip();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('tooltip')).toHaveClass(
      'weni-tooltip-trigger__bubble',
    );
  });
});
