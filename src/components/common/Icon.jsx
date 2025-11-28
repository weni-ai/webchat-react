import React from 'react';
import PropTypes from 'prop-types';
import { icons } from '@/utils/icons';

import './Icon.scss';

/**
 * Icon - Icon component using Material Symbols
 *
 * Uses Material Symbols icon font library for consistent, scalable icons.
 * Icon names should match Material Symbols icon names (e.g., 'send', 'close', 'chat', 'attach_file', 'mic')
 *
 * @example
 * <Icon name="send" size="medium" />
 * <Icon name="close" size="large" filled />
 * <Icon name="error" color="red-500" />
 */
export function Icon({
  name = '',
  size = 'medium',
  color = '',
  filled = false,
  className = '',
  ...props
}) {
  const style = {
    color: color ? `var(--${color})` : 'currentColor',
  };

  const Icon = icons[name][filled ? 'filled' : 'default'];

  return (
    <Icon
      className={`weni-icon weni-icon--${size} ${className}`}
      style={style}
      {...props}
    />
  );
}

Icon.propTypes = {
  /** Material Symbols icon name (e.g., 'send', 'close', 'chat') */
  name: PropTypes.oneOf(Object.keys(icons)).isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'x-large']),
  color: PropTypes.string,
  filled: PropTypes.bool,
  className: PropTypes.string,
};

export default Icon;
