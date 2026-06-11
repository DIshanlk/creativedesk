import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI first (same value as Railway / Atlas).');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String, email: String, password: String, role: String,
  jobTitle: String, department: String, location: String, availability: String,
}, { timestamps: true });
const teamSchema = new mongoose.Schema({ name: String, type: String }, { timestamps: true });
const spaceSchema = new mongoose.Schema({
  name: String, key: String,
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
const categorySchema = new mongoose.Schema({ name: String }, { timestamps: true });
const labelSchema = new mongoose.Schema({ name: String, color: String }, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Team = mongoose.model('Team', teamSchema);
const Space = mongoose.model('Space', spaceSchema);
const Category = mongoose.model('Category', categorySchema);
const Label = mongoose.model('Label', labelSchema);

await mongoose.connect(MONGODB_URI);
console.log('Clearing database...');
await mongoose.connection.db.dropDatabase();

const password = await bcrypt.hash('password123', 10);

const users = await User.insertMany([
  { name: 'Super Admin', email: 'superadmin@creativedesk.local', password, role: 'SuperAdmin', jobTitle: 'Platform Admin', department: 'IT', availability: 'Available' },
  { name: 'Alex Admin', email: 'admin@creativedesk.local', password, role: 'Admin', jobTitle: 'Admin', department: 'Operations', availability: 'Available' },
  { name: 'Maya Manager', email: 'manager@creativedesk.local', password, role: 'Manager', jobTitle: 'Design Manager', department: 'Design', availability: 'Available' },
  { name: 'Sam Designer', email: 'designer@creativedesk.local', password, role: 'Designer', jobTitle: 'UI Designer', department: 'Design', availability: 'Available' },
  { name: 'View Only', email: 'viewer@creativedesk.local', password, role: 'Viewer', jobTitle: 'Stakeholder', department: 'Marketing', availability: 'Available' },
]);

const teams = await Team.insertMany([
  { name: 'Core Design', type: 'Official' },
  { name: 'Brand Studio', type: 'Official' },
]);

await Space.insertMany([
  { name: 'Product Design', key: 'PROD', teamId: teams[0]._id, leadId: users[2]._id },
  { name: 'Marketing Creative', key: 'MKTG', teamId: teams[1]._id, leadId: users[2]._id },
]);

await Category.insertMany([
  { name: 'UI Design' }, { name: 'Illustration' }, { name: 'Motion' }, { name: 'Brand' },
]);

await Label.insertMany([
  { name: 'Urgent', color: '#ef4444' },
  { name: 'Client', color: '#3b82f6' },
  { name: 'Internal', color: '#22c55e' },
]);

console.log('Done! Login with any email above, password: password123');
process.exit(0);
