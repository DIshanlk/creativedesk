import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password } = await request.json();
    
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    const userObj = user.toJSON();
    delete userObj.password;
    
    return NextResponse.json({ token, user: userObj });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
