import { useState, useEffect } from 'react'
import { getInitials } from '../../utils/format'

/**
 * Responsive User Avatar Component.
 * Displays the user's profile picture from Cloudinary with object-fit: cover,
 * and automatically falls back to name initials if no image is set or if loading fails.
 *
 * @param {Object} props
 * @param {Object} props.user - User object containing { name, profilePictureUrl }
 * @param {string} [props.src] - Optional image URL override (useful for upload previews)
 * @param {number|string} [props.size=36] - Size in pixels
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {Object} [props.style={}] - Additional inline styles
 * @param {string} [props.bgColor] - Background color when displaying initials
 * @param {string} [props.textColor] - Text color when displaying initials
 */
export default function UserAvatar({
  user,
  src,
  size = 36,
  className = '',
  style = {},
  bgColor = 'var(--color-primary)',
  textColor = '#ffffff',
}) {
  const [imgError, setImgError] = useState(false)

  const imageSource = src !== undefined ? src : user?.profilePictureUrl

  // Reset error state if the image source changes
  useEffect(() => {
    setImgError(false)
  }, [imageSource])

  const dimension = typeof size === 'number' ? `${size}px` : size
  const fontSize = typeof size === 'number' ? `${Math.max(11, Math.round(size * 0.38))}px` : '0.875rem'

  return (
    <div
      className={`user-avatar-container ${className}`}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: imageSource && !imgError ? '#e2e8f0' : bgColor,
        color: textColor,
        fontWeight: 600,
        fontSize,
        lineHeight: 1,
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
        border: '1px solid var(--color-border)',
        ...style,
      }}
    >
      {imageSource && !imgError ? (
        <img
          src={imageSource}
          alt={user?.name ? `${user.name}'s profile photo` : 'User profile photo'}
          className="user-avatar-img"
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <span>{getInitials(user?.name) || '?'}</span>
      )}
    </div>
  )
}
