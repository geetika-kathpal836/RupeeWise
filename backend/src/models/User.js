import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:  { type: String, required: true },
    currency:      { type: String, default: 'INR' },
    monthlyIncome: { type: mongoose.Types.Decimal128, default: 0 },
    openingBalance:{ type: mongoose.Types.Decimal128, default: 0 },
    profilePictureUrl:      { type: String, default: null },
    profilePicturePublicId: { type: String, default: null },
  },
  { timestamps: true }
)

UserSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

UserSchema.methods.toSafeObject = function () {
  return {
    _id:           this._id,
    name:          this.name,
    email:         this.email,
    currency:      this.currency,
    monthlyIncome: parseFloat(this.monthlyIncome?.toString() || '0'),
    openingBalance:parseFloat(this.openingBalance?.toString() || '0'),
    profilePictureUrl: this.profilePictureUrl || null,
    createdAt:     this.createdAt,
  }
}

export default mongoose.model('User', UserSchema)
