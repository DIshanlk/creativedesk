import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireSuperAdmin } from '@/lib/adminAuth';
import { formatId } from '@/lib/formatMongo';
import User from '@/lib/models/User';
import Task from '@/lib/models/Task';
import Space from '@/lib/models/Space';
import Team from '@/lib/models/Team';
import TeamMember from '@/lib/models/TeamMember';
import Approval from '@/lib/models/Approval';
import Category from '@/lib/models/Category';
import Label from '@/lib/models/Label';
import ActivityLog from '@/lib/models/ActivityLog';
import Notification from '@/lib/models/Notification';
import TaskLabel from '@/lib/models/TaskLabel';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function handleAdminRequest(request: Request, path: string[], method: Method) {
  const auth = await requireSuperAdmin(request);
  if (auth.error) return auth.error;

  const route = path.join('/');
  const url = new URL(request.url);

  try {
    // ─── Stats ───────────────────────────────────────────────────────────────
    if (route === 'stats' && method === 'GET') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const [
        totalUsers, totalTasks, totalSpaces, totalTeams,
        openTasks, doneTasks, overdueTasks, pendingApprovals,
        users, tasks, recentTasks,
      ] = await Promise.all([
        User.countDocuments(),
        Task.countDocuments(),
        Space.countDocuments(),
        Team.countDocuments(),
        Task.countDocuments({ status: { $nin: ['Done', 'Approved'] } }),
        Task.countDocuments({ status: { $in: ['Done', 'Approved'] } }),
        Task.countDocuments({ dueDate: { $lt: now }, status: { $nin: ['Done', 'Approved'] } }),
        Approval.countDocuments({ status: 'Pending Review' }),
        User.find().select('role').lean(),
        Task.find().select('status').lean(),
        Task.find({ createdAt: { $gte: sevenDaysAgo } }).select('createdAt').lean(),
      ]);

      const roleMap: Record<string, number> = {};
      users.forEach((u: any) => { roleMap[u.role] = (roleMap[u.role] || 0) + 1; });
      const roleBreakdown = Object.entries(roleMap).map(([role, count]) => ({ role, count }));

      const statusMap: Record<string, number> = {};
      tasks.forEach((t: any) => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
      const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

      const tasksByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        tasksByDay[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
      }
      recentTasks.forEach((t: any) => {
        const key = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (key in tasksByDay) tasksByDay[key]++;
      });
      const activityTrend = Object.entries(tasksByDay).map(([date, count]) => ({ date, count }));

      return NextResponse.json({
        totalUsers, totalTasks, totalSpaces, totalTeams,
        openTasks, doneTasks, overdueTasks, pendingApprovals,
        roleBreakdown, statusBreakdown, activityTrend,
      });
    }

    // ─── Users ───────────────────────────────────────────────────────────────
    if (route === 'users' && method === 'GET') {
      const users = await User.find().sort({ createdAt: 1 }).lean();
      const enriched = await Promise.all(users.map(async (u: any) => {
        const [teamMembers, assignedTasks, reportedTasks, notifications] = await Promise.all([
          TeamMember.find({ userId: u._id }).populate('teamId').lean(),
          Task.countDocuments({ assigneeId: u._id }),
          Task.countDocuments({ reporterId: u._id }),
          Notification.countDocuments({ userId: u._id }),
        ]);
        const formatted = formatId(u);
        formatted.teamMembers = teamMembers.map((m: any) => ({
          ...formatId(m),
          team: m.teamId ? formatId(m.teamId) : null,
        }));
        formatted._count = { assignedTasks, reportedTasks, notifications };
        return formatted;
      }));
      return NextResponse.json(enriched);
    }

    if (route === 'users' && method === 'POST') {
      const body = await request.json();
      const { name, email, role, jobTitle, department, location, password: rawPw, availability } = body;
      if (!name || !email || !role) {
        return NextResponse.json({ error: 'name, email and role are required' }, { status: 400 });
      }
      const hashed = await bcrypt.hash(rawPw || 'Password@123', 10);
      const user = await User.create({
        name, email, role, jobTitle, department, location,
        password: hashed, availability: availability || 'Available',
      });
      return NextResponse.json(formatId(user.toJSON()), { status: 201 });
    }

    if (route.match(/^users\/[^/]+$/) && method === 'PATCH') {
      const id = path[1];
      const body = await request.json();
      const { password: rawPw, ...data } = body;
      const updateData: any = { ...data };
      if (rawPw) updateData.password = await bcrypt.hash(rawPw, 10);
      const user = await User.findByIdAndUpdate(id, updateData, { new: true });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      return NextResponse.json(formatId(user.toJSON()));
    }

    if (route.match(/^users\/[^/]+$/) && method === 'DELETE') {
      const id = path[1];
      if (auth.user?.id === id) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
      }
      const user = await User.findByIdAndDelete(id);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (route.match(/^users\/[^/]+\/reset-password$/) && method === 'POST') {
      const id = path[1];
      const body = await request.json();
      const newPassword = body.password || 'Password@123';
      const hashed = await bcrypt.hash(newPassword, 10);
      const user = await User.findByIdAndUpdate(id, { password: hashed });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      return NextResponse.json({ success: true, temporaryPassword: newPassword });
    }

    // ─── Spaces ──────────────────────────────────────────────────────────────
    if (route === 'spaces' && method === 'GET') {
      const spaces = await Space.find().populate('teamId leadId').sort({ createdAt: 1 }).lean();
      const enriched = await Promise.all(spaces.map(async (s: any) => {
        const taskCount = await Task.countDocuments({ spaceId: s._id });
        const formatted: any = formatId(s);
        formatted.team = s.teamId ? formatId(s.teamId) : null;
        formatted.lead = s.leadId ? formatId(s.leadId) : null;
        formatted.teamId = formatted.team?.id || null;
        formatted.leadId = formatted.lead?.id || null;
        formatted._count = { tasks: taskCount };
        return formatted;
      }));
      return NextResponse.json(enriched);
    }

    if (route === 'spaces' && method === 'POST') {
      const body = await request.json();
      const { name, key, teamId, leadId } = body;
      if (!name || !key) {
        return NextResponse.json({ error: 'name and key are required' }, { status: 400 });
      }
      const space = await Space.create({
        name, key: key.toUpperCase(),
        teamId: teamId || null, leadId: leadId || null,
      });
      const populated = await Space.findById(space._id).populate('teamId leadId').lean();
      const formatted: any = formatId(populated);
      formatted.team = populated?.teamId ? formatId(populated.teamId) : null;
      formatted.lead = populated?.leadId ? formatId(populated.leadId) : null;
      return NextResponse.json(formatted, { status: 201 });
    }

    if (route.match(/^spaces\/[^/]+$/) && method === 'PATCH') {
      const id = path[1];
      const body = await request.json();
      const { name, key, teamId, leadId } = body;
      const update: any = {};
      if (name) update.name = name;
      if (key) update.key = key.toUpperCase();
      if (teamId !== undefined) update.teamId = teamId || null;
      if (leadId !== undefined) update.leadId = leadId || null;
      const space = await Space.findByIdAndUpdate(id, update, { new: true }).populate('teamId leadId').lean();
      if (!space) return NextResponse.json({ error: 'Space not found' }, { status: 404 });
      const formatted: any = formatId(space);
      formatted.team = space.teamId ? formatId(space.teamId) : null;
      formatted.lead = space.leadId ? formatId(space.leadId) : null;
      return NextResponse.json(formatted);
    }

    if (route.match(/^spaces\/[^/]+$/) && method === 'DELETE') {
      const id = path[1];
      const taskCount = await Task.countDocuments({ spaceId: id });
      if (taskCount > 0) {
        return NextResponse.json({ error: 'Failed to delete space. Make sure it has no tasks first.' }, { status: 500 });
      }
      const space = await Space.findByIdAndDelete(id);
      if (!space) return NextResponse.json({ error: 'Space not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // ─── Teams ───────────────────────────────────────────────────────────────
    if (route === 'teams' && method === 'GET') {
      const teams = await Team.find().sort({ createdAt: 1 }).lean();
      const enriched = await Promise.all(teams.map(async (t: any) => {
        const [members, taskCount, spaceCount] = await Promise.all([
          TeamMember.find({ teamId: t._id }).populate('userId').lean(),
          Task.countDocuments({ teamId: t._id }),
          Space.countDocuments({ teamId: t._id }),
        ]);
        const formatted: any = formatId(t);
        formatted.members = members.map((m: any) => ({
          ...formatId(m),
          user: m.userId ? formatId(m.userId) : null,
        }));
        formatted._count = { tasks: taskCount, spaces: spaceCount };
        return formatted;
      }));
      return NextResponse.json(enriched);
    }

    if (route === 'teams' && method === 'POST') {
      const body = await request.json();
      const { name, type } = body;
      if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      const team = await Team.create({ name, type: type || 'Official' });
      return NextResponse.json(formatId(team.toJSON()), { status: 201 });
    }

    if (route.match(/^teams\/[^/]+$/) && method === 'DELETE') {
      const id = path[1];
      await TeamMember.deleteMany({ teamId: id });
      await Space.updateMany({ teamId: id }, { teamId: null });
      const team = await Team.findByIdAndDelete(id);
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (route.match(/^teams\/[^/]+\/members$/) && method === 'POST') {
      const teamId = path[1];
      const body = await request.json();
      const { userId, isLead } = body;
      const existing = await TeamMember.findOne({ teamId, userId });
      if (existing) {
        return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
      }
      const member = await TeamMember.create({ teamId, userId, isLead: isLead || false });
      const populated = await TeamMember.findById(member._id).populate('userId').lean();
      return NextResponse.json({
        ...formatId(populated),
        user: populated?.userId ? formatId(populated.userId) : null,
      }, { status: 201 });
    }

    if (route.match(/^teams\/[^/]+\/members\/[^/]+$/) && method === 'DELETE') {
      const [, teamId, , userId] = path;
      await TeamMember.deleteOne({ teamId, userId });
      return NextResponse.json({ success: true });
    }

    // ─── Tasks ───────────────────────────────────────────────────────────────
    if (route === 'tasks' && method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '30');
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || '';
      const spaceId = url.searchParams.get('spaceId') || '';

      const filter: any = {};
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { key: { $regex: search, $options: 'i' } },
        ];
      }
      if (status) filter.status = status;
      if (spaceId) filter.spaceId = spaceId;

      const [tasks, total] = await Promise.all([
        Task.find(filter)
          .populate('spaceId assigneeId reporterId')
          .sort({ updatedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Task.countDocuments(filter),
      ]);

      const formattedTasks = tasks.map((t: any) => {
        const task = formatId(t);
        task.space = t.spaceId ? formatId(t.spaceId) : null;
        task.assignee = t.assigneeId ? formatId(t.assigneeId) : null;
        task.reporter = t.reporterId ? formatId(t.reporterId) : null;
        return task;
      });

      return NextResponse.json({ tasks: formattedTasks, total, page, pages: Math.ceil(total / limit) });
    }

    if (route.match(/^tasks\/[^/]+$/) && method === 'DELETE') {
      const id = path[1];
      const task = await Task.findByIdAndDelete(id);
      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      await Promise.all([
        TaskLabel.deleteMany({ taskId: id }),
        ActivityLog.deleteMany({ taskId: id }),
        Approval.deleteMany({ taskId: id }),
      ]);
      return NextResponse.json({ success: true });
    }

    // ─── Logs ────────────────────────────────────────────────────────────────
    if (route === 'logs' && method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      const [logs, total] = await Promise.all([
        ActivityLog.find()
          .populate('userId taskId')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ActivityLog.countDocuments(),
      ]);

      const formattedLogs = logs.map((l: any) => {
        const log = formatId(l);
        log.user = l.userId ? formatId(l.userId) : null;
        log.task = l.taskId ? formatId(l.taskId) : null;
        return log;
      });

      return NextResponse.json({ logs: formattedLogs, total, page, pages: Math.ceil(total / limit) });
    }

    // ─── Categories ──────────────────────────────────────────────────────────
    if (route === 'categories' && method === 'GET') {
      const cats = await Category.find().sort({ name: 1 }).lean();
      const enriched = await Promise.all(cats.map(async (c: any) => {
        const taskCount = await Task.countDocuments({ categoryId: c._id });
        return { ...formatId(c), _count: { tasks: taskCount } };
      }));
      return NextResponse.json(enriched);
    }

    if (route === 'categories' && method === 'POST') {
      const body = await request.json();
      const cat = await Category.create({ name: body.name });
      return NextResponse.json(formatId(cat.toJSON()), { status: 201 });
    }

    if (route.match(/^categories\/[^/]+$/) && method === 'DELETE') {
      const id = path[1];
      await Category.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    // ─── Labels ──────────────────────────────────────────────────────────────
    if (route === 'labels' && method === 'GET') {
      const labels = await Label.find().sort({ name: 1 }).lean();
      const enriched = await Promise.all(labels.map(async (l: any) => {
        const taskCount = await TaskLabel.countDocuments({ labelId: l._id });
        return { ...formatId(l), _count: { tasks: taskCount } };
      }));
      return NextResponse.json(enriched);
    }

    if (route === 'labels' && method === 'POST') {
      const body = await request.json();
      const label = await Label.create({ name: body.name, color: body.color });
      return NextResponse.json(formatId(label.toJSON()), { status: 201 });
    }

    if (route.match(/^labels\/[^/]+$/) && method === 'DELETE') {
      const id = path[1];
      await TaskLabel.deleteMany({ labelId: id });
      await Label.findByIdAndDelete(id);
      return NextResponse.json({ success: true });
    }

    // ─── Broadcast ───────────────────────────────────────────────────────────
    if (route === 'broadcast' && method === 'POST') {
      const body = await request.json();
      const { title, content, userIds } = body;
      const targets = userIds?.length
        ? userIds
        : (await User.find().select('_id').lean()).map((u: any) => u._id.toString());

      await Notification.insertMany(
        targets.map((uid: string) => ({
          userId: uid, title, content, type: 'system', isRead: false,
        }))
      );
      return NextResponse.json({ sent: targets.length });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
