import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { getRules, createRule, updateRule, deleteRule } from '../controllers/recurringController.js'

const router = Router()
router.use(protect)

router.get('/',     getRules)
router.post('/',    createRule)
router.put('/:id',  updateRule)
router.delete('/:id', deleteRule)

export default router
