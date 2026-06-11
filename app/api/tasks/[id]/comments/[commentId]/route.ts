import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Comment from '@/lib/models/Comment';

export async function DELETE(_request: Request, { params }: { params: { id: string; commentId: string } }) {
  try {
    await dbConnect();
    await Comment.findByIdAndDelete(params.commentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
