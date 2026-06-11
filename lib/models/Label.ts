import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const labelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String },
}, { timestamps: true });

toJSONPlugin(labelSchema);

export default mongoose.models.Label || mongoose.model('Label', labelSchema);
