import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const taskSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  workType: { type: String, required: true },
  status: { type: String, default: "To Do" },
  priority: { type: String, default: "Medium" },
  dueDate: { type: Date },
  startDate: { type: Date },
  originalEstimate: { type: Number },
  timeSpent: { type: Number, default: 0 },
  
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', required: true },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
}, { timestamps: true });

toJSONPlugin(taskSchema);

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
