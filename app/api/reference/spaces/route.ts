import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Space from '@/lib/models/Space';
import '@/lib/models/Team';
import '@/lib/models/User';

export async function GET() {
  try {
    await dbConnect();
    const spaces = await Space.find().populate('teamId leadId').lean();
    const formatted = spaces.map((s: any) => {
      const result: any = { ...s, id: s._id.toString() };
      delete result._id;
      delete result.__v;
      if (result.teamId) {
        result.team = { ...result.teamId, id: result.teamId._id?.toString() };
        result.teamId = result.team.id;
      }
      if (result.leadId) {
        result.lead = { ...result.leadId, id: result.leadId._id?.toString() };
        result.leadId = result.lead.id;
      }
      return result;
    });
    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const space = await Space.create(body);
    const populated = await Space.findById(space._id).populate('teamId leadId').lean();
    const result: any = { ...populated, id: populated._id.toString() };
    if (result.teamId) result.team = result.teamId;
    if (result.leadId) result.lead = result.leadId;
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create space' }, { status: 500 });
  }
}
