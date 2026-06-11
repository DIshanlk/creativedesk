import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
import ActivityLog from '@/lib/models/ActivityLog';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { hours, note, userId } = await request.json();
    if (!hours || hours <= 0) {
      return NextResponse.json({ error: 'hours must be > 0' }, { status: 400 });
    }

    const task = await Task.findByIdAndUpdate(
      params.id,
      { $inc: { timeSpent: Math.round(hours * 10) / 10 } },
      { new: true }
    );
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    await ActivityLog.create({
      action: 'time_logged',
      details: JSON.stringify({ hours, note }),
      taskId: params.id,
      userId,
    });

    return NextResponse.json({ timeSpent: task.timeSpent });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to log time' }, { status: 500 });
  }
}
