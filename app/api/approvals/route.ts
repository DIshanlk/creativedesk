import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Approval from '@/lib/models/Approval';
import Task from '@/lib/models/Task';
import Notification from '@/lib/models/Notification';
import User from '@/lib/models/User';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const submitterId = searchParams.get('submitterId');
    const spaceId = searchParams.get('spaceId');
    
    const where: any = {};
    if (submitterId) where.submitterId = submitterId;
    
    let approvals = await Approval.find(where)
      .populate({
        path: 'taskId',
        populate: { path: 'spaceId' }
      })
      .populate('submitterId approverId')
      .sort({ createdAt: -1 })
      .lean();
      
    if (spaceId) {
      approvals = approvals.filter((a: any) => a.taskId?.spaceId?._id?.toString() === spaceId);
    }

    const formatted = approvals.map((a: any) => {
      a.id = a._id.toString();
      if (a.taskId) {
        a.task = a.taskId;
        a.task.id = a.task._id.toString();
        if (a.task.spaceId) {
          a.task.space = a.task.spaceId;
          a.task.space.id = a.task.space._id.toString();
        }
      }
      if (a.submitterId) a.submitter = a.submitterId;
      if (a.approverId) a.approver = a.approverId;
      return a;
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { taskId, submitterId, approverId } = await request.json();
    
    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const approval = await Approval.create({
      taskId, submitterId, approverId: approverId || null, status: 'Pending Review'
    });

    await Task.findByIdAndUpdate(taskId, { status: 'In Review' });

    const submitter = await User.findById(submitterId);

    if (approverId) {
      await Notification.create({
        userId: approverId,
        type: 'approval_requested',
        title: 'Approval requested',
        content: `${submitter?.name} submitted "${task.title}" for your review.`,
        linkUrl: `/approvals`
      });
    } else {
      const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });
      for (const mgr of managers) {
        if (mgr._id.toString() !== submitterId) {
          await Notification.create({
            userId: mgr._id,
            type: 'approval_requested',
            title: 'New approval request',
            content: `${submitter?.name} submitted "${task.title}" for approval.`,
            linkUrl: `/approvals`
          });
        }
      }
    }

    const populated = await Approval.findById(approval._id)
      .populate('taskId submitterId approverId')
      .lean();
      
    const result: any = { ...populated, id: populated._id.toString() };
    if (result.taskId) result.task = result.taskId;
    if (result.submitterId) result.submitter = result.submitterId;
    if (result.approverId) result.approver = result.approverId;

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to submit for approval' }, { status: 500 });
  }
}
