import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
import Team from '@/lib/models/Team';
import User from '@/lib/models/User';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    
    const whereSpace = spaceId ? { spaceId } : {};

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const nextSevenDays = new Date(); nextSevenDays.setDate(nextSevenDays.getDate() + 7);

    const [createdLast7Days, completedLast7Days, updatedLast7Days, dueSoon, overdueTasks, allTasks, teams, people] = await Promise.all([
      Task.countDocuments({ ...whereSpace, createdAt: { $gte: sevenDaysAgo } }),
      Task.countDocuments({ ...whereSpace, status: { $in: ['Done','Approved'] }, updatedAt: { $gte: sevenDaysAgo } }),
      Task.countDocuments({ ...whereSpace, updatedAt: { $gte: sevenDaysAgo } }),
      Task.countDocuments({ ...whereSpace, dueDate: { $gte: new Date(), $lte: nextSevenDays }, status: { $nin: ['Done','Approved'] } }),
      Task.find({ ...whereSpace, dueDate: { $lt: new Date() }, status: { $nin: ['Done','Approved'] } }).populate('assigneeId teamId').lean(),
      Task.find(whereSpace).lean(),
      Team.find().lean(),
      User.find({ role: 'Designer' }).lean()
    ]);

    // Format overdueTasks
    const formattedOverdue = overdueTasks.map((t: any) => {
      t.id = t._id.toString();
      if (t.assigneeId) t.assignee = t.assigneeId;
      if (t.teamId) t.team = t.teamId;
      return t;
    });

    const statusCounts = allTasks.reduce((acc: any, t: any) => { acc[t.status] = (acc[t.status]||0)+1; return acc; }, {});
    const statusDonut = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const priorityCounts = allTasks.reduce((acc: any, t: any) => { acc[t.priority] = (acc[t.priority]||0)+1; return acc; }, {});
    const priorityBar = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

    const teamWorkload = await Promise.all(teams.map(async (t: any) => {
      const count = await Task.countDocuments({ teamId: t._id, status: { $nin: ['Done','Approved'] }, ...whereSpace });
      return { name: t.name, activeTasks: count };
    }));

    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - i); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(dayStart); dayEnd.setHours(23,59,59,999);
      const [created, completed] = await Promise.all([
        Task.countDocuments({ ...whereSpace, createdAt: { $gte: dayStart, $lte: dayEnd } }),
        Task.countDocuments({ ...whereSpace, status: { $in: ['Done','Approved'] }, updatedAt: { $gte: dayStart, $lte: dayEnd } })
      ]);
      trend.push({ name: dayStart.toLocaleDateString('en-US',{weekday:'short'}), created, completed });
    }

    const overloadedDesigners = [];
    for (const p of people) {
      const count = await Task.countDocuments({ assigneeId: p._id, status: { $nin: ['Done','Approved'] }, ...whereSpace });
      if (count > 8) {
        overloadedDesigners.push({ name: p.name, activeTasks: count });
      }
    }

    return NextResponse.json({
      kpis: { createdLast7Days, completedLast7Days, updatedLast7Days, dueSoon },
      charts: { statusDonut, priorityBar, teamWorkload, trend },
      overdueTasks: formattedOverdue,
      overloadedDesigners
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
