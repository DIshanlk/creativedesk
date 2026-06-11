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
      s.id = s._id.toString();
      if (s.teamId) s.team = s.teamId;
      if (s.leadId) s.lead = s.leadId;
      return s;
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
    return NextResponse.json({ ...space.toJSON(), id: space._id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create space' }, { status: 500 });
  }
}
