import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
import Space from '@/lib/models/Space';
import ActivityLog from '@/lib/models/ActivityLog';
import Notification from '@/lib/models/Notification';
import TaskLabel from '@/lib/models/TaskLabel';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get('spaceId');
    
    const where = spaceId ? { spaceId } : {};
    const tasks = await Task.find(where)
      .populate('assigneeId reporterId teamId categoryId')
      .sort({ createdAt: -1 })
      .lean();
      
    // Fetch labels for each task
    const enrichedTasks = await Promise.all(tasks.map(async (task: any) => {
      const taskLabels = await TaskLabel.find({ taskId: task._id }).populate('labelId').lean();
      
      task.id = task._id.toString();
      delete task._id;
      delete task.__v;
      
      // Map populated fields to match frontend expectations
      if (task.assigneeId) { task.assignee = task.assigneeId; delete task.assigneeId; }
      if (task.reporterId) { task.reporter = task.reporterId; delete task.reporterId; }
      if (task.teamId) { task.team = task.teamId; delete task.teamId; }
      if (task.categoryId) { task.category = task.categoryId; delete task.categoryId; }
      
      task.labels = taskLabels.map((tl: any) => ({
        taskId: tl.taskId,
        labelId: tl.labelId,
        label: tl.labelId
      }));
      
      return task;
    }));

    return NextResponse.json(enrichedTasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { spaceId, title, description, workType, status, priority, assigneeId, reporterId, teamId, categoryId, dueDate, startDate, originalEstimate } = body;

    const space = await Space.findById(spaceId);
    if (!space) return NextResponse.json({ error: 'Space not found' }, { status: 400 });

    const count = await Task.countDocuments({ spaceId });
    const key = `${space.key}-${count + 1}`;

    const task = await Task.create({
      key, title, description, workType,
      status: status || 'To Do',
      priority: priority || 'Medium',
      spaceId,
      assigneeId: assigneeId || null,
      reporterId: reporterId || null,
      teamId: teamId || null,
      categoryId: categoryId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      originalEstimate: originalEstimate ? parseInt(originalEstimate) : null,
    });

    if (reporterId) {
      await ActivityLog.create({ action: 'created', taskId: task._id, userId: reporterId });
    }

    if (assigneeId && assigneeId !== reporterId) {
      await Notification.create({
        userId: assigneeId,
        type: 'assigned',
        title: 'You have been assigned a task',
        content: `"${title}" was assigned to you.`,
        linkUrl: `/task/${task._id}`
      });
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId reporterId teamId categoryId')
      .lean();
      
    const result: any = { ...populatedTask };
    result.id = result._id.toString();
    if (result.assigneeId) result.assignee = result.assigneeId;
    if (result.reporterId) result.reporter = result.reporterId;
    if (result.teamId) result.team = result.teamId;
    if (result.categoryId) result.category = result.categoryId;

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
