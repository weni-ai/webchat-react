import { render, screen, fireEvent } from '@testing-library/react';
import { Dropdown } from './Dropdown';

const PANEL_CONTENT = 'Panel content';

function renderDropdown(props = {}) {
  const defaults = {
    content: <span>{PANEL_CONTENT}</span>,
  };
  return render(
    <Dropdown
      {...defaults}
      {...props}
    >
      {props.children ?? <button type="button">Open</button>}
    </Dropdown>,
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('Dropdown — rendering', () => {
  it('renders the trigger child', () => {
    renderDropdown();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('does not render the panel on initial mount', () => {
    renderDropdown();
    expect(screen.queryByText(PANEL_CONTENT)).not.toBeInTheDocument();
  });

  it('applies a custom className to the wrapper', () => {
    const { container } = renderDropdown({ className: 'my-class' });
    expect(container.firstChild).toHaveClass('weni-dropdown', 'my-class');
  });

  it('returns children as-is when children is not a valid React element and renderTrigger is absent', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <Dropdown content={<span>{PANEL_CONTENT}</span>}>
        not an element
      </Dropdown>,
    );
    expect(container).toHaveTextContent('not an element');
    expect(container.querySelector('.weni-dropdown')).not.toBeInTheDocument();
    console.error.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Trigger aria attributes
// ---------------------------------------------------------------------------

describe('Dropdown — trigger aria attributes', () => {
  it('sets aria-haspopup="menu" on the trigger', () => {
    renderDropdown();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    );
  });

  it('sets aria-expanded="false" on the trigger when closed', () => {
    renderDropdown();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('sets aria-expanded="true" on the trigger when open', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('sets aria-controls on the trigger linking it to the panel', () => {
    renderDropdown();
    const trigger = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    const panel = screen.getByRole('region');
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
  });
});

// ---------------------------------------------------------------------------
// Open / close via trigger
// ---------------------------------------------------------------------------

describe('Dropdown — open and close via trigger', () => {
  it('shows the panel after clicking the trigger', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText(PANEL_CONTENT)).toBeInTheDocument();
  });

  it('hides the panel after clicking the trigger a second time', () => {
    renderDropdown();
    const trigger = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByText(PANEL_CONTENT)).not.toBeInTheDocument();
  });

  it('preserves the original onClick handler of the child element', () => {
    const onClick = jest.fn();
    renderDropdown({
      children: (
        <button
          type="button"
          onClick={onClick}
        >
          Open
        </button>
      ),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Close on outside click
// ---------------------------------------------------------------------------

describe('Dropdown — close on outside click', () => {
  it('closes the panel when clicking outside the component', () => {
    const { container } = renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText(PANEL_CONTENT)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText(PANEL_CONTENT)).not.toBeInTheDocument();
  });

  it('keeps the panel open when clicking inside the container', () => {
    const { container } = renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    fireEvent.mouseDown(container.firstChild);
    expect(screen.getByText(PANEL_CONTENT)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Close on Escape key
// ---------------------------------------------------------------------------

describe('Dropdown — close on Escape', () => {
  it('closes the panel when Escape is pressed', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText(PANEL_CONTENT)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText(PANEL_CONTENT)).not.toBeInTheDocument();
  });

  it('does not throw when Escape is pressed while panel is closed', () => {
    renderDropdown();
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Close on panel click
// ---------------------------------------------------------------------------

describe('Dropdown — close on panel click', () => {
  it('closes the panel when an item inside the panel is clicked', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('region'));
    expect(screen.queryByText(PANEL_CONTENT)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Panel attributes and placement classes
// ---------------------------------------------------------------------------

describe('Dropdown — panel attributes', () => {
  it('panel has role="region"', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('applies panelAriaLabel to the panel', () => {
    renderDropdown({ panelAriaLabel: 'Options menu' });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('region')).toHaveAttribute(
      'aria-label',
      'Options menu',
    );
  });

  it('does not set aria-label on the panel when panelAriaLabel is empty', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('region')).not.toHaveAttribute('aria-label');
  });

  it('applies a custom panelClassName to the panel', () => {
    renderDropdown({ panelClassName: 'custom-panel' });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('region')).toHaveClass('custom-panel');
  });

  it.each([
    ['top', 'weni-dropdown__panel--top'],
    ['bottom', 'weni-dropdown__panel--bottom'],
    ['left-top', 'weni-dropdown__panel--left-top'],
    ['left-bottom', 'weni-dropdown__panel--left-bottom'],
  ])('applies placement class "%s"', (placement, expectedClass) => {
    renderDropdown({ placement });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('region')).toHaveClass(expectedClass);
  });

  it('defaults to the top placement class when placement is not provided', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('region')).toHaveClass('weni-dropdown__panel--top');
  });

  it('defaults to the top placement class for an unrecognised placement value', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderDropdown({ placement: 'invalid' });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('region')).toHaveClass('weni-dropdown__panel--top');
    console.error.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// renderTrigger prop
// ---------------------------------------------------------------------------

describe('Dropdown — renderTrigger', () => {
  it('renders the trigger returned by renderTrigger', () => {
    render(
      <Dropdown
        content={<span>{PANEL_CONTENT}</span>}
        renderTrigger={(props) => (
          <button
            {...props}
            type="button"
          >
            Custom trigger
          </button>
        )}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Custom trigger' }),
    ).toBeInTheDocument();
  });

  it('opens the panel when the renderTrigger button is clicked', () => {
    render(
      <Dropdown
        content={<span>{PANEL_CONTENT}</span>}
        renderTrigger={(props) => (
          <button
            {...props}
            type="button"
          >
            Custom trigger
          </button>
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Custom trigger' }));
    expect(screen.getByText(PANEL_CONTENT)).toBeInTheDocument();
  });

  it('passes open state to renderTrigger callback', () => {
    const renderTrigger = jest.fn((props, { open }) => (
      <button
        {...props}
        type="button"
        data-open={open}
      >
        Custom trigger
      </button>
    ));
    render(
      <Dropdown
        content={<span>{PANEL_CONTENT}</span>}
        renderTrigger={renderTrigger}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Custom trigger' }),
    ).toHaveAttribute('data-open', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Custom trigger' }));

    expect(
      screen.getByRole('button', { name: 'Custom trigger' }),
    ).toHaveAttribute('data-open', 'true');
  });

  it('prefers renderTrigger over children when both are supplied', () => {
    render(
      <Dropdown
        content={<span>{PANEL_CONTENT}</span>}
        renderTrigger={(props) => (
          <button
            {...props}
            type="button"
          >
            Render trigger
          </button>
        )}
      >
        <button type="button">Child trigger</button>
      </Dropdown>,
    );
    expect(
      screen.getByRole('button', { name: 'Render trigger' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Child trigger' }),
    ).not.toBeInTheDocument();
  });
});
