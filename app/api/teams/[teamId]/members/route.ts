import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TeamMember from '@/lib/models/TeamMember';
import { formatId } from '@/lib/formatMongo';

export async function POST(request: Request, { params }: { params: { teamId: string } }) {
  try {
    await dbConnect();
    const { userId, isLead } = await request.json();
    const existing = await TeamMember.findOne({ teamId: params.teamId, userId });
    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
    }

    const member = await TeamMember.create({
      teamId: params.teamId,
      userId,
      isLead: isLead || false,
    });
    const populated = await TeamMember.findById(member._id).populate('userId').lean();
    return NextResponse.json({
      ...formatId(populated),
      user: populated?.userId ? formatId(populated.userId) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}
