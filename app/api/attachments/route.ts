import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Attachment from '@/lib/models/Attachment';
import Task from '@/lib/models/Task';
import Space from '@/lib/models/Space';
import { formatId } from '@/lib/formatMongo';

export async function GET() {
  try {
    await dbConnect();
    const attachments = await Attachment.find().sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(attachments.map(async (att: any) => {
      const task = await Task.findById(att.taskId).populate('spaceId').lean();
      const formatted: any = formatId(att);
      if (task) {
        formatted.task = {
          ...formatId(task),
          space: task.spaceId ? formatId(task.spaceId) : null,
        };
      }
      return formatted;
    }));
    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
