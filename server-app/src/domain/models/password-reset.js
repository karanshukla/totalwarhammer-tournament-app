import crypto from "crypto";

import mongoose from "mongoose";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

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
    expires: RESET_TOKEN_TTL_MS / 1000,
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
  // The TTL index only guarantees eventual deletion (MongoDB sweeps once a
  // minute, and the index may be absent on a restored collection), so the
  // lifetime is enforced in the query too.
  const resetToken = await this.findOne({
    resetKey,
    isUsed: false,
    createdAt: { $gt: new Date(Date.now() - RESET_TOKEN_TTL_MS) },
  });
  return resetToken;
};

passwordResetSchema.statics.invalidateOutstandingTokens = async function (
  userId,
) {
  await this.updateMany({ userId, isUsed: false }, { $set: { isUsed: true } });
};

const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);

export default PasswordReset;
