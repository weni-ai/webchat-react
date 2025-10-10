import PropTypes from 'prop-types';
import 'material-symbols';

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
  outlined = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  className = '', 
  ...props 
}) {
  const variantClass = outlined ? 'material-symbols-outlined' : 'material-symbols-rounded';
  
  const style = {
    color: color ? `var(--${color})` : 'currentColor',
    fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`
  };
  
  return (
    <span 
      className={`weni-icon ${variantClass} weni-icon--${size} ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}

Icon.propTypes = {
  /** Material Symbols icon name (e.g., 'send', 'close', 'chat') */
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'x-large']),
  color: PropTypes.string,
  filled: PropTypes.bool,
  outlined: PropTypes.bool,
  /** Font weight (100-700) */
  weight: PropTypes.number,
  /** Grade adjustment (-25 to 200) */
  grade: PropTypes.number,
  /** Optical size for different display sizes */
  opticalSize: PropTypes.number,
  className: PropTypes.string
};

export default Icon;

