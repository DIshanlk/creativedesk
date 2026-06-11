import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const { ids, data } = await request.json();
    if (!ids?.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });

    const cleanData: any = {};
    if (data.status) cleanData.status = data.status;
    if (data.priority) cleanData.priority = data.priority;
    if (data.assigneeId !== undefined) cleanData.assigneeId = data.assigneeId || null;

    await Task.updateMany({ _id: { $in: ids } }, cleanData);
    return NextResponse.json({ updated: ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to bulk update' }, { status: 500 });
  }
}
