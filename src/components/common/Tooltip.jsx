import { useState, useId, cloneElement, isValidElement } from 'react';
import PropTypes from 'prop-types';

import './Tooltip.scss';

/**
 * Small label shown on hover/focus around a single interactive child (e.g. icon button).
 * @param {boolean} [disabled] - When true, the tooltip never shows (e.g. while a parent dropdown is open).
 */
export function Tooltip({ label, children, className = '', disabled = false }) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  if (!isValidElement(children)) {
    return children;
  }

  const { onMouseEnter, onMouseLeave, onFocus, onBlur, ...restChildProps } =
    children.props;

  const showBubble = visible && !disabled;

  const trigger = cloneElement(children, {
    ...restChildProps,
    'aria-describedby': showBubble ? tooltipId : undefined,
    onMouseEnter: (e) => {
      onMouseEnter?.(e);
      setVisible(true);
    },
    onMouseLeave: (e) => {
      onMouseLeave?.(e);
      setVisible(false);
    },
    onFocus: (e) => {
      onFocus?.(e);
      setVisible(true);
    },
    onBlur: (e) => {
      onBlur?.(e);
      setVisible(false);
    },
  });

  return (
    <span className={`weni-tooltip-trigger ${className}`.trim()}>
      {trigger}
      {showBubble ? (
        <span
          id={tooltipId}
          className="weni-tooltip-trigger__bubble"
          role="tooltip"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

Tooltip.propTypes = {
  label: PropTypes.node.isRequired,
  children: PropTypes.element.isRequired,
  className: PropTypes.string,
  disabled: PropTypes.bool,
};
