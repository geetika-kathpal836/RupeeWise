import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary using server-side environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})

/**
 * Check whether Cloudinary environment variables are configured.
 */
export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

/**
 * Upload an image buffer to Cloudinary under the 'rupeewise/profile-pictures' folder.
 * Uses facial detection cropping and automatic optimization.
 *
 * @param {Buffer} buffer - Image file buffer
 * @param {string} userId - Authenticated user's MongoDB ID
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export async function uploadProfilePicture(buffer, userId) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured on the server.')
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'rupeewise/profile-pictures',
        public_id: `user_${userId}_${Date.now()}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
          {
            width: 400,
            height: 400,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error)
        }
        resolve({
          secure_url: result.secure_url,
          public_id:  result.public_id,
        })
      }
    )

    uploadStream.end(buffer)
  })
}

/**
 * Delete a profile picture from Cloudinary using its public ID.
 *
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<any>}
 */
export async function deleteProfilePicture(publicId) {
  if (!publicId) return null
  if (!isCloudinaryConfigured()) {
    console.warn('Cloudinary is not configured; skipping asset deletion for:', publicId)
    return null
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    })
    return result
  } catch (err) {
    console.error('Failed to delete Cloudinary asset:', err.message)
    throw err
  }
}

export default cloudinary
