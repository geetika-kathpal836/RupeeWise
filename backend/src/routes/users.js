import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import {
  getMe,
  updateMe,
  changePassword,
  uploadProfilePicture,
  removeProfilePicture,
} from '../controllers/userController.js'
import { handleProfilePictureUpload } from '../middleware/uploadMiddleware.js'

const router = Router()
router.use(protect)

router.get('/me',          getMe)
router.put('/me',          updateMe)
router.patch('/me',        updateMe)
router.put('/me/password', changePassword)
router.post('/me/password', changePassword)

// Profile picture endpoints
router.post('/profile-picture', handleProfilePictureUpload, uploadProfilePicture)
router.delete('/profile-picture', removeProfilePicture)

export default router
