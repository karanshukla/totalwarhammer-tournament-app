import mongoose from "mongoose";
import crypto from "crypto";

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  resetKey: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // Token expires after 1 hour (3600 seconds)
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
});

passwordResetSchema.index({ userId: 1, resetKey: 1 }, { unique: true });

passwordResetSchema.statics.createResetToken = async function (userId) {
  const resetKey = crypto.randomBytes(32).toString("hex");

  return this.create({
    userId,
    resetKey,
  });
};

passwordResetSchema.statics.validateResetToken = async function (resetKey) {
  const resetToken = await this.findOne({ resetKey, isUsed: false });
  return resetToken;
};

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);

export default PasswordReset;
