import {
  useState,
  useRef,
  useEffect,
  useId,
  cloneElement,
  isValidElement,
} from 'react';
import PropTypes from 'prop-types';

import './Dropdown.scss';

const PLACEMENT_CLASS = {
  top: 'weni-dropdown__panel--top',
  bottom: 'weni-dropdown__panel--bottom',
  'left-top': 'weni-dropdown__panel--left-top',
  'left-bottom': 'weni-dropdown__panel--left-bottom',
};

/**
 * Click-triggered panel anchored to a single child.
 * @param {'top' | 'bottom' | 'left-top' | 'left-bottom'} placement - Vertical side and horizontal align
 *   (centered vs left-aligned with trigger). Default: top.
 * @param {function(object, { open: boolean }): React.ReactNode} [renderTrigger] - Spread the first
 *   argument on the real button; use `open` to sync UI (e.g. Tooltip `disabled={open}`).
 */
export function Dropdown({
  children,
  renderTrigger,
  content,
  placement = 'top',
  className = '',
  panelClassName = '',
  panelAriaLabel = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const triggerProps = {
    type: 'button',
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    'aria-controls': panelId,
    onClick: () => {
      setOpen((prev) => !prev);
    },
  };

  let trigger;
  if (typeof renderTrigger === 'function') {
    trigger = renderTrigger(triggerProps, { open });
  } else if (isValidElement(children)) {
    const { onClick, ...restChildProps } = children.props;
    trigger = cloneElement(children, {
      ...restChildProps,
      type: children.props.type ?? 'button',
      'aria-expanded': open,
      'aria-haspopup': 'menu',
      'aria-controls': panelId,
      onClick: (e) => {
        onClick?.(e);
        setOpen((prev) => !prev);
      },
    });
  } else {
    return children;
  }

  const placementClass = PLACEMENT_CLASS[placement] ?? PLACEMENT_CLASS.top;

  return (
    <span
      ref={containerRef}
      className={`weni-dropdown ${className}`.trim()}
    >
      {trigger}
      {open ? (
        <div
          id={panelId}
          className={`weni-dropdown__panel ${placementClass} ${panelClassName}`.trim()}
          role="region"
          aria-label={panelAriaLabel || undefined}
          onClick={() => setOpen(false)}
        >
          {content}
        </div>
      ) : null}
    </span>
  );
}

Dropdown.propTypes = {
  children: PropTypes.element,
  renderTrigger: PropTypes.func,
  content: PropTypes.node.isRequired,
  placement: PropTypes.oneOf(['top', 'bottom', 'left-top', 'left-bottom']),
  className: PropTypes.string,
  panelClassName: PropTypes.string,
  panelAriaLabel: PropTypes.string,
};
