import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Team from '@/lib/models/Team';
import TeamMember from '@/lib/models/TeamMember';

export async function GET() {
  try {
    await dbConnect();
    const teams = await Team.find().lean();
    
    const enriched = await Promise.all(teams.map(async (team: any) => {
      const members = await TeamMember.find({ teamId: team._id }).populate('userId').lean();
      team.id = team._id.toString();
      team.members = members.map((m: any) => ({ ...m, id: m._id.toString(), user: m.userId }));
      return team;
    }));
    
    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const team = await Team.create(body);
    return NextResponse.json({ ...team.toJSON(), id: team._id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
