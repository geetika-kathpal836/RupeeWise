import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js'

const router = Router()
router.use(protect)

router.get('/',     getCategories)
router.post('/',    createCategory)
router.put('/:id',  updateCategory)
router.delete('/:id', deleteCategory)

export default router
