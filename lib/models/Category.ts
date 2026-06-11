import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

toJSONPlugin(categorySchema);

export default mongoose.models.Category || mongoose.model('Category', categorySchema);
