import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const linkedTaskSchema = new mongoose.Schema({
  sourceTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  targetTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  type: { type: String, required: true },
}, { timestamps: true });

linkedTaskSchema.index({ sourceTaskId: 1, targetTaskId: 1 }, { unique: true });

toJSONPlugin(linkedTaskSchema);

export default mongoose.models.LinkedTask || mongoose.model('LinkedTask', linkedTaskSchema);
