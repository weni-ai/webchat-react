import React from 'react'
import PropTypes from 'prop-types'
import { Icon } from './Icon'
import './Button.scss'

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
  icon = '',
  ...props 
}) {
  // TODO: Implement button variants and sizes
  // TODO: Add loading spinner when isLoading is true
  
  return (
    <button
      className={`weni-button weni-button--${variant} weni-button--${size}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* TODO: Add loading spinner */}
      {icon && <Icon name={icon} />}

      {children}
    </button>
  )
}

Button.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary', 'warning', 'attention']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  isLoading: PropTypes.bool,
  icon: PropTypes.string
}

export default Button

