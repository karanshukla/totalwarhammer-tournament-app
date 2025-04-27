import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: false },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.hashPassword = async function(password) {
  return await bcrypt.hash(password, 10);
};

userSchema.methods.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;