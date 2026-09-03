import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';
import { Icon } from '@/components/common/Icon';
import './Avatar.scss';

export const DEFAULT_AVATAR_ACCESSIBLE_NAME =
  'VTEX CX shopping assistant avatar';

/**
 * Avatar - User avatar component
 *
 * Displays user avatar with support for images and fallback icon.
 * Sizes match Icon component sizes for consistency.
 *
 * @example
 * <Avatar src="https://example.com/avatar.jpg" alt="John Doe" size="medium" />
 * <Avatar size="large" />
 */
export function Avatar({
  src = '',
  alt = '',
  size = 'medium',
  shape = 'circle',
  className = '',
  onError = null,
  ...props
}) {
  const sizeValue = typeof size === 'number' ? size : size;
  const [imageError, setImageError] = useState(false);

  const handleImageError = (e) => {
    setImageError(true);
    if (onError) {
      onError(e);
    }
  };

  const showImage = src && !imageError;
  const accessibleName = alt || DEFAULT_AVATAR_ACCESSIBLE_NAME;

  const style = useMemo(() => {
    if (typeof size === 'number') {
      return {
        width: sizeValue,
        height: sizeValue,
        fontSize: sizeValue * 0.45,
      };
    }

    return {};
  }, [size]);

  const avatarClassName = `
    weni-avatar
    ${typeof size === 'string' ? `weni-avatar--${size}` : ''}
    weni-avatar--${shape}
    ${className}
  `;

  const iconSize =
    typeof size === 'string' && size !== 'full' ? size : 'x-large';

  if (showImage) {
    return (
      <img
        src={src}
        alt={accessibleName}
        className={avatarClassName}
        style={style}
        onError={handleImageError}
        {...props}
      />
    );
  }

  return (
    <Icon
      name="rounded_x"
      size={iconSize}
      color="weni-main-color"
      filled
      className={`${avatarClassName} weni-avatar--with-background-color`}
      style={style}
      role="img"
      aria-label={accessibleName}
      {...props}
    />
  );
}

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOfType([
    PropTypes.oneOf(['small', 'medium', 'large', 'x-large', 'full']),
    PropTypes.number,
  ]),
  /** Avatar shape */
  shape: PropTypes.oneOf(['circle', 'square', 'rounded']),
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Callback when image fails to load */
  onError: PropTypes.func,
};

export default Avatar;
