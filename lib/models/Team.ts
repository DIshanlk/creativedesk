import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
}, { timestamps: true });

toJSONPlugin(teamSchema);

export default mongoose.models.Team || mongoose.model('Team', teamSchema);
