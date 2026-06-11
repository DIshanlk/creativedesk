import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Comment from '@/lib/models/Comment';
import ActivityLog from '@/lib/models/ActivityLog';
import Task from '@/lib/models/Task';
import Notification from '@/lib/models/Notification';
import { formatId } from '@/lib/formatMongo';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { content, authorId } = await request.json();
    const comment = await Comment.create({ content, taskId: params.id, authorId });
    await ActivityLog.create({ action: 'commented', taskId: params.id, userId: authorId });

    const populated = await Comment.findById(comment._id).populate('authorId').lean();
    const task = await Task.findById(params.id).select('title reporterId assigneeId').lean();

    if (task) {
      const author = populated?.authorId as any;
      const notified = new Set<string>([authorId]);
      for (const targetId of [task.reporterId?.toString(), task.assigneeId?.toString()]) {
        if (targetId && !notified.has(targetId)) {
          notified.add(targetId);
          await Notification.create({
            userId: targetId,
            type: 'comment',
            title: 'New comment on your task',
            content: `${author?.name || 'Someone'} commented on "${task.title}"`,
            linkUrl: `/task/${params.id}`,
            isRead: false,
          });
        }
      }
    }

    return NextResponse.json({
      ...formatId(populated),
      author: populated?.authorId ? formatId(populated.authorId) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
