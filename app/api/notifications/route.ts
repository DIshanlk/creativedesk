import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/lib/models/Notification';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    const where = userId ? { userId } : {};
    const notifications = await Notification.find(where)
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
      
    return NextResponse.json(notifications.map((n: any) => ({ ...n, id: n._id.toString() })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
