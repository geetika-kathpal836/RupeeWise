export function errorHandler(err, req, res, next) {
  // Mongoose CastError or BSON malformed ObjectId
  if (err.name === 'CastError' || err.name === 'BSONError') {
    return res.status(400).json({ message: 'Invalid ID or parameter format.' })
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({ message: messages.join('. ') })
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    return res.status(409).json({ message: `A record with this ${field} already exists.` })
  }

  // JWT errors are handled in auth middleware — catch leftovers
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired session.' })
  }

  // Default
  const status  = err.status || err.statusCode || 500
  const message = (process.env.NODE_ENV === 'production' && status === 500)
    ? 'An unexpected error occurred.'
    : err.message || 'Server error'

  res.status(status).json({ message })
}
