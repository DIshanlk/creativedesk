import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/lib/models/Notification';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { userId } = await request.json();
    await Notification.updateMany({ userId }, { isRead: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
