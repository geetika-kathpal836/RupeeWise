import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { toNumber } from '../utils/dateUtils.js'
import {
  uploadProfilePicture as uploadToCloudinary,
  deleteProfilePicture as deleteFromCloudinary,
  isCloudinaryConfigured,
} from '../services/cloudinaryService.js'

export async function getMe(req, res) {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user })
}

export async function updateMe(req, res, next) {
  try {
    const { name, currency, monthlyIncome, openingBalance } = req.body
    const updateSet = {}

    if (name !== undefined) {
      if (!name || !name.trim())
        return res.status(400).json({ message: 'Name cannot be empty.' })
      updateSet.name = name.trim()
    }

    if (currency !== undefined) {
      updateSet.currency = currency || 'INR'
    }

    if (monthlyIncome !== undefined && monthlyIncome !== null && monthlyIncome !== '') {
      const parsedIncome = parseFloat(monthlyIncome)
      if (isNaN(parsedIncome) || parsedIncome < 0) {
        return res.status(400).json({ message: 'monthlyIncome must be a non-negative number.' })
      }
      updateSet.monthlyIncome = parsedIncome
    }

    if (openingBalance !== undefined && openingBalance !== null && openingBalance !== '') {
      const parsedBalance = parseFloat(openingBalance)
      if (isNaN(parsedBalance)) {
        return res.status(400).json({ message: 'openingBalance must be a valid number.' })
      }
      updateSet.openingBalance = parsedBalance
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateSet },
      { returnDocument: 'after' }
    )

    res.json({ user: user.toSafeObject() })
  } catch (err) { next(err) }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'currentPassword and newPassword are required.' })

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters.' })

    const user = await User.findById(req.user._id)
    const valid = await user.comparePassword(currentPassword)
    if (!valid)
      return res.status(401).json({ message: 'Current password is incorrect.' })

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    await user.save()
    res.json({ message: 'Password changed.' })
  } catch (err) { next(err) }
}

export async function uploadProfilePicture(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' })
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        message: 'Cloudinary storage is not configured on the server. Please check server environment variables.',
      })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const previousPublicId = user.profilePicturePublicId

    // 1. Upload new image to Cloudinary
    let uploadResult
    try {
      uploadResult = await uploadToCloudinary(req.file.buffer, user._id.toString())
    } catch (uploadErr) {
      return res.status(502).json({
        message: 'Failed to upload image to cloud storage: ' + (uploadErr.message || 'Unknown error'),
      })
    }

    // 2. Persist new image reference in MongoDB
    try {
      user.profilePictureUrl = uploadResult.secure_url
      user.profilePicturePublicId = uploadResult.public_id
      await user.save()
    } catch (dbErr) {
      // If DB update fails, attempt to delete newly uploaded asset to prevent orphans
      deleteFromCloudinary(uploadResult.public_id).catch(() => {})
      return next(dbErr)
    }

    // 3. Clean up the previous asset if replacement succeeds
    if (previousPublicId && previousPublicId !== uploadResult.public_id) {
      deleteFromCloudinary(previousPublicId).catch((cleanupErr) => {
        console.error('Failed to delete replaced profile picture asset:', cleanupErr.message)
      })
    }

    res.json({
      message: 'Profile picture uploaded successfully.',
      profilePictureUrl: user.profilePictureUrl,
      user: user.toSafeObject(),
    })
  } catch (err) {
    next(err)
  }
}

export async function removeProfilePicture(req, res, next) {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const publicId = user.profilePicturePublicId

    // 1. Delete asset from Cloudinary if present
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId)
      } catch (cloudErr) {
        console.warn('Could not delete Cloudinary asset, continuing with database cleanup:', cloudErr.message)
      }
    }

    // 2. Clear MongoDB references
    user.profilePictureUrl = null
    user.profilePicturePublicId = null
    await user.save()

    res.json({
      message: 'Profile picture removed successfully.',
      profilePictureUrl: null,
      user: user.toSafeObject(),
    })
  } catch (err) {
    next(err)
  }
}
