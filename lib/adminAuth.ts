import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export async function requireSuperAdmin(request: Request) {
  await dbConnect();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
    }
    if (user.role !== 'SuperAdmin') {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
    return { user: formatUser(user) };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }
}

function formatUser(user: any) {
  const obj = user.toJSON();
  delete obj.password;
  return obj;
}
