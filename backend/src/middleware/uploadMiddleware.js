import multer from 'multer'
import path from 'path'

/**
 * Validate that the buffer contains the true magic bytes of JPEG, PNG, or WebP.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
export function isValidImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return false

  // JPEG check: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true
  }

  // PNG check: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true
  }

  // WebP check: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  const isRiff =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  const isWebp =
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  if (isRiff && isWebp) {
    return true
  }

  return false
}

const storage = multer.memoryStorage()

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (!allowedMimes.includes(file.mimetype) || !allowedExtensions.includes(ext)) {
    return cb(new Error('Only JPEG, PNG, and WebP images are allowed.'))
  }
  cb(null, true)
}

const uploadFields = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
  },
  fileFilter,
}).fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
])

/**
 * Express middleware for profile picture uploads with strict format & size validation.
 */
export function handleProfilePictureUpload(req, res, next) {
  uploadFields(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the 5 MB limit.' })
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Please select an image file to upload.' })
      }
      return res.status(400).json({ message: err.message || 'Image upload validation failed.' })
    }

    const file =
      req.files?.profilePicture?.[0] ||
      req.files?.image?.[0] ||
      req.files?.file?.[0]

    if (!file) {
      return res.status(400).json({ message: 'Please select an image file to upload.' })
    }

    // Inspect actual file content magic bytes to reject disguised or corrupt files
    if (!isValidImageMagicBytes(file.buffer)) {
      return res.status(400).json({
        message: 'File content does not match a valid JPEG, PNG, or WebP image.',
      })
    }

    // Attach chosen file to req.file for controller convenience
    req.file = file
    next()
  })
}
