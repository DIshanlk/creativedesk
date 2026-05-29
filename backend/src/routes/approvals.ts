import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { notify } from '../utils/notify';

const router = Router();
const prisma = new PrismaClient();

// List all approvals (optionally filter by spaceId or submitterId)
router.get('/', async (req, res) => {
  const { submitterId, spaceId } = req.query;
  const where: any = {};
  if (submitterId) where.submitterId = String(submitterId);
  if (spaceId) where.task = { spaceId: String(spaceId) };

  const approvals = await prisma.approval.findMany({
    where,
    include: { task: { include: { space: true } }, submitter: true, approver: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(approvals);
});

// Submit a task for approval (creates an Approval record)
router.post('/', async (req, res) => {
  try {
    const { taskId, submitterId, approverId } = req.body;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const approval = await prisma.approval.create({
      data: { taskId, submitterId, approverId: approverId || null, status: 'Pending Review' },
      include: { task: true, submitter: true, approver: true }
    });

    // Update task status to In Review
    await prisma.task.update({ where: { id: taskId }, data: { status: 'In Review' } });

    // Notify the approver
    if (approverId) {
      await notify({
        userId: approverId,
        type: 'approval_requested',
        title: 'Approval requested',
        content: `${approval.submitter.name} submitted "${task.title}" for your review.`,
        linkUrl: `/approvals`
      });
    }

    // Notify any existing Manager/Admin of the task's space if no specific approver set
    if (!approverId) {
      const managers = await prisma.user.findMany({ where: { role: { in: ['Admin', 'Manager'] } } });
      for (const mgr of managers) {
        if (mgr.id !== submitterId) {
          await notify({
            userId: mgr.id,
            type: 'approval_requested',
            title: 'New approval request',
            content: `${approval.submitter.name} submitted "${task.title}" for approval.`,
            linkUrl: `/approvals`
          });
        }
      }
    }

    res.json(approval);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit for approval' });
  }
});

// Approve or reject
router.patch('/:id', async (req, res) => {
  try {
    const { status, comment, approverId } = req.body;
    const approval = await prisma.approval.update({
      where: { id: req.params.id },
      data: { status, comment, approverId: approverId || undefined },
      include: { task: { include: { space: true } }, submitter: true, approver: true }
    });

    // Update task status in sync
    let newTaskStatus: string | null = null;
    if (status === 'Approved') newTaskStatus = 'Approved';
    if (status === 'Changes Requested') newTaskStatus = 'In Progress';
    if (newTaskStatus) {
      await prisma.task.update({ where: { id: approval.taskId }, data: { status: newTaskStatus } });
    }

    // Notify submitter
    const typeMap: any = {
      'Approved': 'approval_approved',
      'Changes Requested': 'changes_requested',
      'Rejected': 'approval_rejected',
    };
    await notify({
      userId: approval.submitterId,
      type: typeMap[status] || 'status_changed',
      title: `Your submission was ${status}`,
      content: `"${approval.task.title}" ${
        status === 'Approved' ? 'has been approved!' :
        status === 'Changes Requested' ? 'requires changes. Please review the feedback.' :
        'was rejected.'
      }${comment ? ' Note: ' + comment : ''}`,
      linkUrl: `/task/${approval.taskId}`
    });

    res.json(approval);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});

export default router;
