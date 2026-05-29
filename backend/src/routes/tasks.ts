import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { notify } from '../utils/notify';

const router = Router();
const prisma = new PrismaClient();

// Get all tasks
router.get('/', async (req, res) => {
  const { spaceId } = req.query;
  const where = spaceId ? { spaceId: String(spaceId) } : {};
  const tasks = await prisma.task.findMany({
    where,
    include: { assignee: true, reporter: true, team: true, category: true, labels: { include: { label: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tasks);
});

// Get task by ID
router.get('/:id', async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: {
      assignee: true, reporter: true, team: true, category: true, space: true,
      labels: { include: { label: true } },
      subtasks: { include: { assignee: true } },
      comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
      attachments: true,
      activityLogs: { include: { user: true }, orderBy: { createdAt: 'desc' } },
      approvals: { include: { submitter: true, approver: true } },
      linkedTo: { include: { targetTask: true } },
      linkedFrom: { include: { sourceTask: true } }
    }
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { spaceId, title, description, workType, status, priority, assigneeId, reporterId, teamId, categoryId, dueDate, startDate, originalEstimate } = req.body;

    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) return res.status(400).json({ error: 'Space not found' });

    const count = await prisma.task.count({ where: { spaceId } });
    const key = `${space.key}-${count + 1}`;

    const task = await prisma.task.create({
      data: {
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
      },
      include: { assignee: true, reporter: true, team: true, category: true }
    });

    if (reporterId) {
      await prisma.activityLog.create({ data: { action: 'created', taskId: task.id, userId: reporterId } });
    }

    // Notify assignee (if different from reporter)
    if (assigneeId && assigneeId !== reporterId) {
      await notify({
        userId: assigneeId,
        type: 'assigned',
        title: 'You have been assigned a task',
        content: `"${title}" was assigned to you${task.reporter ? ' by ' + task.reporter.name : ''}.`,
        linkUrl: `/task/${task.id}`
      });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.patch('/:id', async (req, res) => {
  try {
    const oldTask = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { assignee: true, reporter: true }
    });
    const { userId, ...updateData } = req.body;

    const cleanData: any = { ...updateData };
    ['assigneeId', 'reporterId', 'teamId', 'categoryId'].forEach(f => { if (cleanData[f] === '') cleanData[f] = null; });
    if (cleanData.dueDate === '') cleanData.dueDate = null;
    if (cleanData.startDate === '') cleanData.startDate = null;
    if (cleanData.timeSpent) cleanData.timeSpent = parseInt(cleanData.timeSpent);
    if (cleanData.originalEstimate) cleanData.originalEstimate = parseInt(cleanData.originalEstimate);

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: cleanData,
      include: { assignee: true, reporter: true, team: true, category: true }
    });

    const actorId = userId || task.reporterId;

    // Status changed notification
    if (updateData.status && oldTask?.status !== updateData.status) {
      await prisma.activityLog.create({
        data: {
          action: 'status_changed',
          details: JSON.stringify({ from: oldTask?.status, to: updateData.status }),
          taskId: task.id,
          userId: actorId
        }
      });

      // Notify reporter when assignee changes status (and reporter is not the actor)
      if (task.reporterId && task.reporterId !== actorId) {
        await notify({
          userId: task.reporterId,
          type: 'status_changed',
          title: `Task status changed to "${updateData.status}"`,
          content: `"${task.title}" was moved from "${oldTask?.status}" to "${updateData.status}".`,
          linkUrl: `/task/${task.id}`
        });
      }
      // Notify assignee when reporter/manager changes status (and assignee is not the actor)
      if (task.assigneeId && task.assigneeId !== actorId) {
        await notify({
          userId: task.assigneeId,
          type: 'status_changed',
          title: `Task status changed to "${updateData.status}"`,
          content: `"${task.title}" was moved from "${oldTask?.status}" to "${updateData.status}".`,
          linkUrl: `/task/${task.id}`
        });
      }
    }

    // New assignee notification
    const newAssigneeId = cleanData.assigneeId;
    if (newAssigneeId && newAssigneeId !== oldTask?.assigneeId) {
      const actor = await prisma.user.findUnique({ where: { id: actorId } });
      await notify({
        userId: newAssigneeId,
        type: 'assigned',
        title: 'You have been assigned a task',
        content: `"${task.title}" was assigned to you${actor ? ' by ' + actor.name : ''}.`,
        linkUrl: `/task/${task.id}`
      });
    }

    // Unassigned notification — tell the previous assignee
    if (oldTask?.assigneeId && cleanData.assigneeId === null) {
      await notify({
        userId: oldTask.assigneeId,
        type: 'unassigned',
        title: 'You have been unassigned from a task',
        content: `You were removed from "${task.title}".`,
        linkUrl: `/task/${task.id}`
      });
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { content, authorId } = req.body;
    const comment = await prisma.comment.create({
      data: { content, taskId: req.params.id, authorId },
      include: { author: true }
    });
    await prisma.activityLog.create({ data: { action: 'commented', taskId: req.params.id, userId: authorId } });

    // Notify the task's reporter and assignee (if not the commenter)
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: { title: true, reporterId: true, assigneeId: true } });
    if (task) {
      const notified = new Set<string>();
      notified.add(authorId); // don't notify yourself
      for (const targetId of [task.reporterId, task.assigneeId]) {
        if (targetId && !notified.has(targetId)) {
          notified.add(targetId);
          await notify({
            userId: targetId,
            type: 'comment',
            title: 'New comment on your task',
            content: `${comment.author.name} commented on "${task.title}": "${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"`,
            linkUrl: `/task/${req.params.id}`
          });
        }
      }
    }

    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete comment
router.delete('/:taskId/comments/:commentId', async (req, res) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.commentId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Add subtask
router.post('/:id/subtasks', async (req, res) => {
  try {
    const { title, assigneeId } = req.body;
    const subtask = await prisma.subtask.create({
      data: { title, taskId: req.params.id, assigneeId: assigneeId || null, status: 'To Do' },
      include: { assignee: true }
    });
    // Notify subtask assignee
    if (assigneeId) {
      const parentTask = await prisma.task.findUnique({ where: { id: req.params.id }, select: { title: true } });
      await notify({
        userId: assigneeId,
        type: 'assigned',
        title: 'New subtask assigned to you',
        content: `"${title}" subtask under "${parentTask?.title}" was assigned to you.`,
        linkUrl: `/task/${req.params.id}`
      });
    }
    res.json(subtask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add subtask' });
  }
});

// Update subtask
router.patch('/:taskId/subtasks/:subtaskId', async (req, res) => {
  try {
    const subtask = await prisma.subtask.update({
      where: { id: req.params.subtaskId },
      data: req.body,
      include: { assignee: true }
    });
    res.json(subtask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

// Log time on a task (adds to timeSpent, records in activityLog)
router.post('/:id/log-time', async (req, res) => {
  try {
    const { hours, note, userId } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ error: 'hours must be > 0' });

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { timeSpent: { increment: Math.round(hours * 10) / 10 } }
    });

    await prisma.activityLog.create({
      data: {
        action: 'time_logged',
        details: JSON.stringify({ hours, note }),
        taskId: req.params.id,
        userId
      }
    });

    res.json({ timeSpent: task.timeSpent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log time' });
  }
});

// Add / remove task dependency (blocks / is blocked by)
router.post('/:id/links', async (req, res) => {
  try {
    const { targetTaskId, type } = req.body; // type: 'blocks' | 'is blocked by' | 'relates to' | 'duplicates'
    const existing = await prisma.linkedTask.findFirst({
      where: { OR: [{ sourceTaskId: req.params.id, targetTaskId }, { sourceTaskId: targetTaskId, targetTaskId: req.params.id }] }
    });
    if (existing) return res.status(400).json({ error: 'Link already exists' });
    const link = await prisma.linkedTask.create({ data: { sourceTaskId: req.params.id, targetTaskId, type } });
    res.status(201).json(link);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

router.delete('/:id/links/:linkId', async (req, res) => {
  try {
    await prisma.linkedTask.delete({ where: { id: req.params.linkId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// Bulk update tasks
router.patch('/bulk/update', async (req, res) => {
  try {
    const { ids, data } = req.body; // ids: string[], data: { status?, priority?, assigneeId? }
    if (!ids?.length) return res.status(400).json({ error: 'ids required' });
    const cleanData: any = {};
    if (data.status) cleanData.status = data.status;
    if (data.priority) cleanData.priority = data.priority;
    if (data.assigneeId !== undefined) cleanData.assigneeId = data.assigneeId || null;
    await prisma.task.updateMany({ where: { id: { in: ids } }, data: cleanData });
    res.json({ updated: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update' });
  }
});

export default router;
