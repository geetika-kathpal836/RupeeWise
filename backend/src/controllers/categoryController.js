import mongoose from 'mongoose'
import Category from '../models/Category.js'
import Budget from '../models/Budget.js'

export async function getCategories(req, res, next) {
  try {
    const categories = await Category.find({ user: req.user._id }).sort({ type: 1, name: 1 })
    res.json({ categories })
  } catch (err) { next(err) }
}

export async function createCategory(req, res, next) {
  try {
    const { name, type, icon, color } = req.body
    if (!name?.trim() || !type)
      return res.status(400).json({ message: 'Category name and type are required.' })

    if (!['income', 'expense', 'both'].includes(type)) {
      return res.status(400).json({ message: 'type must be income, expense, or both.' })
    }

    const cat = await Category.create({
      user:  req.user._id,
      name:  name.trim(),
      type,
      icon:  icon  || 'bi-three-dots',
      color: color || '#64748b',
    })
    res.status(201).json({ category: cat })
  } catch (err) { next(err) }
}

export async function updateCategory(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid category ID.' })
    }

    const { name, type, icon, color } = req.body
    const update = {}

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Category name cannot be empty.' })
      update.name = name.trim()
    }
    if (type !== undefined) {
      if (!['income', 'expense', 'both'].includes(type)) {
        return res.status(400).json({ message: 'type must be income, expense, or both.' })
      }
      update.type = type
    }
    if (icon !== undefined) update.icon = icon
    if (color !== undefined) update.color = color

    const cat = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: update },
      { new: true, runValidators: true }
    )
    if (!cat) return res.status(404).json({ message: 'Category not found.' })
    res.json({ category: cat })
  } catch (err) { next(err) }
}

export async function deleteCategory(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid category ID.' })
    }

    const cat = await Category.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!cat) return res.status(404).json({ message: 'Category not found.' })

    // Clean up any budgets linked to this category
    await Budget.deleteMany({ category: req.params.id, user: req.user._id }).catch(() => {})

    res.json({ message: 'Category deleted.' })
  } catch (err) { next(err) }
}
