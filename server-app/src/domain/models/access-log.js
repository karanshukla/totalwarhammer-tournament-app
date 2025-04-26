// Access Log model
import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const AccessLog = mongoose.model('AccessLog', accessLogSchema);
export default AccessLog;