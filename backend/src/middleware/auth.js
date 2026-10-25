import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export async function protect(req, res, next) {
  try {
    let token = req.cookies?.token

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user    = await User.findById(decoded.userId).select('-passwordHash')

    if (!user) {
      return res.status(401).json({ message: 'Session is no longer valid. Please log in again.' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' })
  }
}
