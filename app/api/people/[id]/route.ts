import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { password: rawPw, ...data } = await request.json();
    
    if (rawPw) {
      data.password = await bcrypt.hash(rawPw, 10);
    }
    
    const user = await User.findByIdAndUpdate(params.id, data, { new: true });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    
    const userObj = user.toJSON();
    delete userObj.password;
    
    return NextResponse.json(userObj);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
