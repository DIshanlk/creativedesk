import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const taskLabelSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  labelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Label', required: true },
});

taskLabelSchema.index({ taskId: 1, labelId: 1 }, { unique: true });

toJSONPlugin(taskLabelSchema);

export default mongoose.models.TaskLabel || mongoose.model('TaskLabel', taskLabelSchema);
