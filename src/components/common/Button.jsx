import PropTypes from 'prop-types';
import { Icon } from './Icon';
import './Button.scss';

/**
 * Button - Reusable button component
 * TODO: Add loading state
 */

function NativeAnchor({
  href,
  children,
  disabled = false,
  onClick = () => {},
  ...props
}) {
  const hrefValue = disabled ? undefined : href;
  const onClickValue = disabled ? undefined : onClick;

  return (
    <a
      href={hrefValue}
      onClick={onClickValue}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </a>
  );
}

NativeAnchor.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
};

export function Button({
  children,
  onClick = () => {},
  disabled = false,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  icon = '',
  iconColor = '',
  iconFilled = false,
  alignContent = 'center',
  hoverState = false,
  className = '',
  href = '',
  ...props
}) {
  // TODO: Implement button variants and sizes
  // TODO: Add loading spinner when isLoading is true

  function getIconColor() {
    if (disabled) return 'fg-muted';

    const mapColorToVariant = {
      primary: 'white',
      secondary: 'fg-emphasized',
      tertiary: 'fg-emphasized',
      warning: 'white',
      attention: 'white',
    };
    return iconColor || mapColorToVariant[variant];
  }

  const ButtonComponent = href ? NativeAnchor : 'button';
  const isDisabled = disabled || isLoading;

  return (
    <ButtonComponent
      className={[
        'weni-button',
        `weni-button--${variant}`,
        `weni-button--${size}`,
        `weni-button--${alignContent}-aligned`,
        hoverState && 'weni-button--hover-state',
        icon && !children && 'weni-button--only-icon',
        className,
        isDisabled ? 'weni-button--disabled' : 'weni-button--enabled',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={isDisabled}
      href={href}
      {...props}
    >
      {/* TODO: Add loading spinner */}
      {icon && (
        <Icon
          name={icon}
          color={getIconColor()}
          filled={iconFilled}
        />
      )}

      {children}
    </ButtonComponent>
  );
}

Button.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'tertiary',
    'warning',
    'attention',
  ]),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  isLoading: PropTypes.bool,
  icon: PropTypes.string,
  iconColor: PropTypes.string,
  iconFilled: PropTypes.bool,
  alignContent: PropTypes.oneOf(['start', 'center', 'end']),
  hoverState: PropTypes.bool,
  className: PropTypes.string,
  href: PropTypes.string,
  children: PropTypes.node,
};

export default Button;
