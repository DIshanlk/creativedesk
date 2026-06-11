import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const approvalSchema = new mongoose.Schema({
  status: { type: String, default: "Not Submitted" },
  comment: { type: String },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  submitterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

toJSONPlugin(approvalSchema);

export default mongoose.models.Approval || mongoose.model('Approval', approvalSchema);
