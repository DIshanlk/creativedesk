import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const teamMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  isLead: { type: Boolean, default: false },
}, { timestamps: true });

teamMemberSchema.index({ userId: 1, teamId: 1 }, { unique: true });

toJSONPlugin(teamMemberSchema);

export default mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);
