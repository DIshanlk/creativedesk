import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const activityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

toJSONPlugin(activityLogSchema);

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
