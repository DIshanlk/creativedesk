import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkedTask from '@/lib/models/LinkedTask';

export async function DELETE(_request: Request, { params }: { params: { id: string; linkId: string } }) {
  try {
    await dbConnect();
    await LinkedTask.findByIdAndDelete(params.linkId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
