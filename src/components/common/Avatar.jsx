import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';
import './Avatar.scss';

/**
 * Avatar - User avatar component
 *
 * Displays user avatar with support for images and fallback initials.
 * Sizes match Icon component sizes for consistency.
 *
 * @example
 * <Avatar src="https://example.com/avatar.jpg" alt="John Doe" size="medium" />
 * <Avatar name="John Doe" size="large" />
 */
export function Avatar({
  src = '',
  alt = '',
  name = '',
  size = 'medium',
  shape = 'circle',
  className = '',
  onError = null,
  ...props
}) {
  const sizeValue = typeof size === 'number' ? size : size;
  const [imageError, setImageError] = useState(false);

  const getInitials = () => {
    if (name) {
      return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return '';
  };

  const handleImageError = (e) => {
    setImageError(true);
    if (onError) {
      onError(e);
    }
  };

  const displayInitials = getInitials();
  const showImage = src && !imageError;

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

  return (
    <section
      className={`
        weni-avatar
        ${typeof size === 'string' ? `weni-avatar--${size}` : ''}
        weni-avatar--${shape}
        ${!showImage && 'weni-avatar--with-background-color'}
        ${className}
      `}
      role="img"
      aria-label={alt || name || 'Avatar'}
      style={style}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name}
          className="weni-avatar__image"
          onError={handleImageError}
        />
      ) : (
        displayInitials && (
          <p className="weni-avatar__initials">{displayInitials}</p>
        )
      )}
    </section>
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
