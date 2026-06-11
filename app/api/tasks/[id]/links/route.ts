import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkedTask from '@/lib/models/LinkedTask';
import { formatId } from '@/lib/formatMongo';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { targetTaskId, type } = await request.json();
    const existing = await LinkedTask.findOne({
      $or: [
        { sourceTaskId: params.id, targetTaskId },
        { sourceTaskId: targetTaskId, targetTaskId: params.id },
      ],
    });
    if (existing) return NextResponse.json({ error: 'Link already exists' }, { status: 400 });

    const link = await LinkedTask.create({
      sourceTaskId: params.id,
      targetTaskId,
      type,
    });
    return NextResponse.json(formatId(link.toJSON()), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}
