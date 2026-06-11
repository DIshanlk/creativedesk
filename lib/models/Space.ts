import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const spaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

toJSONPlugin(spaceSchema);

export default mongoose.models.Space || mongoose.model('Space', spaceSchema);
