import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, default: "To Do" },
  priority: { type: String, default: "Medium" },
  dueDate: { type: Date },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

toJSONPlugin(subtaskSchema);

export default mongoose.models.Subtask || mongoose.model('Subtask', subtaskSchema);
