import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Label from '@/lib/models/Label';

export async function GET() {
  try {
    await dbConnect();
    const labels = await Label.find().lean();
    return NextResponse.json(labels.map((l: any) => ({ ...l, id: l._id.toString() })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
