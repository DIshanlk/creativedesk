/**
 * SuperAdmin-only routes.
 * Every endpoint here is protected by requireSuperAdmin middleware.
 * SuperAdmin can: manage all users, spaces, teams, tasks, labels,
 *                 categories, view all activity logs, and see system stats.
 */
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { requireSuperAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All routes require SuperAdmin
router.use(requireSuperAdmin);

// ─── System Stats ─────────────────────────────────────────────────────────────
router.get('/stats', async (_req, res: Response) => {
  const [
    totalUsers, totalTasks, totalSpaces, totalTeams,
    openTasks, doneTasks, overdueTasks, pendingApprovals
  ] = await Promise.all([
    prisma.user.count(),
    prisma.task.count(),
    prisma.space.count(),
    prisma.team.count(),
    prisma.task.count({ where: { status: { notIn: ['Done', 'Approved'] } } }),
    prisma.task.count({ where: { status: { in: ['Done', 'Approved'] } } }),
    prisma.task.count({ where: { dueDate: { lt: new Date() }, status: { notIn: ['Done', 'Approved'] } } }),
    prisma.approval.count({ where: { status: 'Pending Review' } })
  ]);

  const roleBreakdown = await prisma.user.groupBy({ by: ['role'], _count: { _all: true } });
  const statusBreakdown = await prisma.task.groupBy({ by: ['status'], _count: { _all: true } });

  // Tasks created per day last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentTasks = await prisma.task.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true }
  });
  const tasksByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    tasksByDay[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
  }
  recentTasks.forEach(t => {
    const key = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (key in tasksByDay) tasksByDay[key]++;
  });
  const activityTrend = Object.entries(tasksByDay).map(([date, count]) => ({ date, count }));

  res.json({
    totalUsers, totalTasks, totalSpaces, totalTeams,
    openTasks, doneTasks, overdueTasks, pendingApprovals,
    roleBreakdown: roleBreakdown.map(r => ({ role: r.role, count: r._count._all })),
    statusBreakdown: statusBreakdown.map(s => ({ status: s.status, count: s._count._all })),
    activityTrend
  });
});

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', async (_req, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      teamMembers: { include: { team: true } },
      _count: { select: { assignedTasks: true, reportedTasks: true, notifications: true } }
    }
  });
  res.json(users.map(({ password: _, ...u }) => u));
});

router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, jobTitle, department, location, password: rawPw, availability } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: 'name, email and role are required' });
    const hashed = await bcrypt.hash(rawPw || 'Password@123', 10);
    const user = await prisma.user.create({
      data: { name, email, role, jobTitle, department, location, password: hashed, availability: availability || 'Available' }
    });
    const { password: _, ...rest } = user as any;
    res.status(201).json(rest);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { password: rawPw, ...data } = req.body;
    const updateData: any = { ...data };
    if (rawPw) updateData.password = await bcrypt.hash(rawPw, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    const { password: _, ...rest } = user as any;
    res.json(rest);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Prevent deleting yourself
    if (req.user?.id === req.params.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Reset password shortcut
router.post('/users/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const newPassword = req.body.password || 'Password@123';
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed } });
    res.json({ success: true, temporaryPassword: newPassword });
  } catch {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ─── Space Management ─────────────────────────────────────────────────────────
router.get('/spaces', async (_req, res: Response) => {
  const spaces = await prisma.space.findMany({
    include: {
      team: true,
      lead: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { tasks: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(spaces);
});

router.post('/spaces', async (req: AuthRequest, res: Response) => {
  try {
    const { name, key, teamId, leadId } = req.body;
    if (!name || !key) return res.status(400).json({ error: 'name and key are required' });
    const space = await prisma.space.create({
      data: { name, key: key.toUpperCase(), teamId: teamId || null, leadId: leadId || null },
      include: { team: true, lead: { select: { id: true, name: true } } }
    });
    res.status(201).json(space);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Space key already exists' });
    res.status(500).json({ error: 'Failed to create space' });
  }
});

router.patch('/spaces/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, key, teamId, leadId } = req.body;
    const space = await prisma.space.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(key && { key: key.toUpperCase() }),
        teamId: teamId !== undefined ? (teamId || null) : undefined,
        leadId: leadId !== undefined ? (leadId || null) : undefined
      },
      include: { team: true, lead: { select: { id: true, name: true } } }
    });
    res.json(space);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Space not found' });
    res.status(500).json({ error: 'Failed to update space' });
  }
});

router.delete('/spaces/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.space.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Space not found' });
    res.status(500).json({ error: 'Failed to delete space. Make sure it has no tasks first.' });
  }
});

// ─── Team Management ──────────────────────────────────────────────────────────
router.get('/teams', async (_req, res: Response) => {
  const teams = await prisma.team.findMany({
    include: {
      members: { include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } } },
      _count: { select: { tasks: true, spaces: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(teams);
});

router.post('/teams', async (req: AuthRequest, res: Response) => {
  try {
    const { name, type } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const team = await prisma.team.create({ data: { name, type: type || 'Official' } });
    res.status(201).json(team);
  } catch {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

router.patch('/teams/:id', async (req: AuthRequest, res: Response) => {
  try {
    const team = await prisma.team.update({ where: { id: req.params.id }, data: req.body });
    res.json(team);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Team not found' });
    res.status(500).json({ error: 'Failed to update team' });
  }
});

router.delete('/teams/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.team.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Team not found' });
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

router.post('/teams/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, isLead } = req.body;
    const member = await prisma.teamMember.create({
      data: { teamId: req.params.id, userId, isLead: isLead || false },
      include: { user: { select: { id: true, name: true, role: true } } }
    });
    res.status(201).json(member);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'User is already a member of this team' });
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/teams/:teamId/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.teamMember.deleteMany({ where: { teamId: req.params.teamId, userId: req.params.userId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ─── Task Management ──────────────────────────────────────────────────────────
router.get('/tasks', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const search = (req.query.search as string) || '';
  const status = req.query.status as string;
  const spaceId = req.query.spaceId as string;

  const where: any = {};
  if (search) where.OR = [{ title: { contains: search } }, { key: { contains: search } }];
  if (status) where.status = status;
  if (spaceId) where.spaceId = spaceId;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        space: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.task.count({ where })
  ]);

  res.json({ tasks, total, page, pages: Math.ceil(total / limit) });
});

router.delete('/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ─── Activity Logs ────────────────────────────────────────────────────────────
router.get('/logs', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      include: {
        user: { select: { id: true, name: true, role: true } },
        task: { select: { id: true, key: true, title: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.activityLog.count()
  ]);

  res.json({ logs, total, page, pages: Math.ceil(total / limit) });
});

// ─── Category & Label Management ──────────────────────────────────────────────
router.get('/categories', async (_req, res: Response) => {
  const cats = await prisma.category.findMany({ include: { _count: { select: { tasks: true } } }, orderBy: { name: 'asc' } });
  res.json(cats);
});

router.post('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const cat = await prisma.category.create({ data: { name: req.body.name } });
    res.status(201).json(cat);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Category already exists' });
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.delete('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

router.get('/labels', async (_req, res: Response) => {
  const labels = await prisma.label.findMany({ include: { _count: { select: { tasks: true } } }, orderBy: { name: 'asc' } });
  res.json(labels);
});

router.post('/labels', async (req: AuthRequest, res: Response) => {
  try {
    const label = await prisma.label.create({ data: { name: req.body.name, color: req.body.color } });
    res.status(201).json(label);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Label already exists' });
    res.status(500).json({ error: 'Failed to create label' });
  }
});

router.delete('/labels/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.label.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

// ─── Notifications broadcast ──────────────────────────────────────────────────
router.post('/broadcast', async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, userIds } = req.body;
    const targets = userIds?.length
      ? userIds
      : (await prisma.user.findMany({ select: { id: true } })).map((u: { id: string }) => u.id);

    await prisma.notification.createMany({
      data: targets.map((uid: string) => ({ userId: uid, title, content, type: 'system', isRead: false }))
    });
    res.json({ sent: targets.length });
  } catch {
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

export default router;
