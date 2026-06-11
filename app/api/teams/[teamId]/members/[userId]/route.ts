import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TeamMember from '@/lib/models/TeamMember';

export async function DELETE(_request: Request, { params }: { params: { teamId: string; userId: string } }) {
  try {
    await dbConnect();
    await TeamMember.deleteOne({ teamId: params.teamId, userId: params.userId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
