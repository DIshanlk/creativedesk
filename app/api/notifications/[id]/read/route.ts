import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/lib/models/Notification';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const notification = await Notification.findByIdAndUpdate(params.id, { isRead: true }, { new: true }).lean();
    if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...notification, id: notification._id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
