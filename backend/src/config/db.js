import mongoose from 'mongoose'

let isConnected = false

export async function connectDB() {
  if (isConnected) return

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.')
  }

  try {
    await mongoose.connect(uri)
    isConnected = true
    console.log('✅  MongoDB connected')
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message)
    process.exit(1)
  }
}
