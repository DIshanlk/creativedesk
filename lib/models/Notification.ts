import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  linkUrl: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

toJSONPlugin(notificationSchema);

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
