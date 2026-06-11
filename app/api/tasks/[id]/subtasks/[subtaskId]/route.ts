import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subtask from '@/lib/models/Subtask';
import { formatId } from '@/lib/formatMongo';

export async function PATCH(request: Request, { params }: { params: { id: string; subtaskId: string } }) {
  try {
    await dbConnect();
    const body = await request.json();
    const subtask = await Subtask.findByIdAndUpdate(params.subtaskId, body, { new: true })
      .populate('assigneeId')
      .lean();
    if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    return NextResponse.json({
      ...formatId(subtask),
      assignee: subtask.assigneeId ? formatId(subtask.assigneeId) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 });
  }
}
