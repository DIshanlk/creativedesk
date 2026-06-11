import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: "$2a$10$xyz" },
  role: { type: String, required: true },
  jobTitle: { type: String },
  department: { type: String },
  location: { type: String },
  avatarUrl: { type: String },
  availability: { type: String, default: "Available" },
}, { timestamps: true });

toJSONPlugin(userSchema);

export default mongoose.models.User || mongoose.model('User', userSchema);
