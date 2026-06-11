import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subtask from '@/lib/models/Subtask';
import Task from '@/lib/models/Task';
import Notification from '@/lib/models/Notification';
import { formatId } from '@/lib/formatMongo';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { title, assigneeId } = await request.json();
    const subtask = await Subtask.create({
      title,
      taskId: params.id,
      assigneeId: assigneeId || null,
      status: 'To Do',
    });

    if (assigneeId) {
      const parentTask = await Task.findById(params.id).select('title').lean();
      await Notification.create({
        userId: assigneeId,
        type: 'assigned',
        title: 'New subtask assigned to you',
        content: `"${title}" subtask under "${parentTask?.title}" was assigned to you.`,
        linkUrl: `/task/${params.id}`,
        isRead: false,
      });
    }

    const populated = await Subtask.findById(subtask._id).populate('assigneeId').lean();
    return NextResponse.json({
      ...formatId(populated),
      assignee: populated?.assigneeId ? formatId(populated.assigneeId) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add subtask' }, { status: 500 });
  }
}
