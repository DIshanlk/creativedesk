import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/dashboard', async (req, res) => {
  const { spaceId } = req.query;
  const whereSpace = spaceId ? { spaceId: String(spaceId) } : {};

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const nextSevenDays = new Date(); nextSevenDays.setDate(nextSevenDays.getDate() + 7);

  const [createdLast7Days, completedLast7Days, updatedLast7Days, dueSoon, overdueTasks, allTasks, teams, people] = await Promise.all([
    prisma.task.count({ where: { ...whereSpace, createdAt: { gte: sevenDaysAgo } } }),
    prisma.task.count({ where: { ...whereSpace, status: { in: ['Done','Approved'] }, updatedAt: { gte: sevenDaysAgo } } }),
    prisma.task.count({ where: { ...whereSpace, updatedAt: { gte: sevenDaysAgo } } }),
    prisma.task.count({ where: { ...whereSpace, dueDate: { gte: new Date(), lte: nextSevenDays }, status: { notIn: ['Done','Approved'] } } }),
    prisma.task.findMany({ where: { ...whereSpace, dueDate: { lt: new Date() }, status: { notIn: ['Done','Approved'] } }, include: { assignee: true, team: true } }),
    prisma.task.findMany({ where: whereSpace }),
    prisma.team.findMany({ include: { tasks: { where: { status: { notIn: ['Done','Approved'] }, ...whereSpace } } } }),
    prisma.user.findMany({ where: { role: 'Designer' }, include: { assignedTasks: { where: { status: { notIn: ['Done','Approved'] }, ...whereSpace } } } })
  ]);

  const statusCounts = allTasks.reduce((acc: any, t) => { acc[t.status] = (acc[t.status]||0)+1; return acc; }, {});
  const statusDonut = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const priorityCounts = allTasks.reduce((acc: any, t) => { acc[t.priority] = (acc[t.priority]||0)+1; return acc; }, {});
  const priorityBar = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

  const teamWorkload = teams.map(t => ({ name: t.name, activeTasks: t.tasks.length }));

  // Trend: tasks created/completed each of last 7 days
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - i); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart); dayEnd.setHours(23,59,59,999);
    const [created, completed] = await Promise.all([
      prisma.task.count({ where: { ...whereSpace, createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.task.count({ where: { ...whereSpace, status: { in: ['Done','Approved'] }, updatedAt: { gte: dayStart, lte: dayEnd } } })
    ]);
    trend.push({ name: dayStart.toLocaleDateString('en-US',{weekday:'short'}), created, completed });
  }

  // Overloaded designers
  const overloadedDesigners = people.filter(p => p.assignedTasks.length > 8).map(p => ({ name: p.name, activeTasks: p.assignedTasks.length }));

  res.json({
    kpis: { createdLast7Days, completedLast7Days, updatedLast7Days, dueSoon },
    charts: { statusDonut, priorityBar, teamWorkload, trend },
    overdueTasks,
    overloadedDesigners
  });
});

export default router;
