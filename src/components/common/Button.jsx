import PropTypes from 'prop-types';

/**
 * Button - Reusable button component
 * TODO: Support different button variants (primary, secondary, etc.)
 * TODO: Add loading state
 * TODO: Add icon support
 * TODO: Handle disabled state styling
 */
export function Button({ 
  children, 
  onClick = () => {}, 
  disabled = false, 
  variant = 'primary', 
  size = 'medium',
  isLoading = false,
  ...props 
}) {
  // TODO: Implement button variants and sizes
  // TODO: Add loading spinner when isLoading is true
  
  return (
    <button
      className={`weni-button weni-button-${variant} weni-button-${size}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* TODO: Add loading spinner */}
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  isLoading: PropTypes.bool
};

export default Button;

