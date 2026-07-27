import bcrypt from "bcrypt";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: false },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Set whenever the password changes (updatePassword). Sessions issued before
  // this timestamp are treated as stale and rejected on their next request —
  // see AuthStateService.isAuthenticated. Null = never changed = no check.
  passwordChangedAt: { type: Date, default: null },
});

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

userSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
