import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
import User from '@/lib/models/User';
import Team from '@/lib/models/Team';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    if (!q) return NextResponse.json({ tasks: [], people: [], teams: [] });

    const regex = new RegExp(q, 'i');

    const [tasks, people, teams] = await Promise.all([
      Task.find({ $or: [{ title: regex }, { key: regex }] }).limit(5).lean(),
      User.find({ name: regex }).limit(5).lean(),
      Team.find({ name: regex }).limit(5).lean()
    ]);

    return NextResponse.json({
      tasks: tasks.map((t: any) => ({ ...t, id: t._id.toString() })),
      people: people.map((p: any) => ({ ...p, id: p._id.toString() })),
      teams: teams.map((t: any) => ({ ...t, id: t._id.toString() }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
