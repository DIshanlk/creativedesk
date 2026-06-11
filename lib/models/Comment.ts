import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

toJSONPlugin(commentSchema);

export default mongoose.models.Comment || mongoose.model('Comment', commentSchema);
