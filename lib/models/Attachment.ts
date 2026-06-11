import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const attachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  url: { type: String, required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
}, { timestamps: true });

toJSONPlugin(attachmentSchema);

export default mongoose.models.Attachment || mongoose.model('Attachment', attachmentSchema);
