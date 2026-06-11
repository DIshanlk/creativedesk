import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/lib/models/Task';
import TaskLabel from '@/lib/models/TaskLabel';
import Subtask from '@/lib/models/Subtask';
import Comment from '@/lib/models/Comment';
import Attachment from '@/lib/models/Attachment';
import ActivityLog from '@/lib/models/ActivityLog';
import Approval from '@/lib/models/Approval';
import LinkedTask from '@/lib/models/LinkedTask';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const task: any = await Task.findById(params.id)
      .populate('assigneeId reporterId teamId categoryId spaceId')
      .lean();
      
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Fetch related data
    const [labels, subtasks, comments, attachments, activityLogs, approvals, linkedTo, linkedFrom] = await Promise.all([
      TaskLabel.find({ taskId: task._id }).populate('labelId').lean(),
      Subtask.find({ taskId: task._id }).populate('assigneeId').lean(),
      Comment.find({ taskId: task._id }).populate('authorId').sort({ createdAt: 1 }).lean(),
      Attachment.find({ taskId: task._id }).lean(),
      ActivityLog.find({ taskId: task._id }).populate('userId').sort({ createdAt: -1 }).lean(),
      Approval.find({ taskId: task._id }).populate('submitterId approverId').lean(),
      LinkedTask.find({ sourceTaskId: task._id }).populate('targetTaskId').lean(),
      LinkedTask.find({ targetTaskId: task._id }).populate('sourceTaskId').lean(),
    ]);

    // Format response
    task.id = task._id.toString();
    if (task.assigneeId) task.assignee = task.assigneeId;
    if (task.reporterId) task.reporter = task.reporterId;
    if (task.teamId) task.team = task.teamId;
    if (task.categoryId) task.category = task.categoryId;
    if (task.spaceId) task.space = task.spaceId;

    task.labels = labels.map((tl: any) => ({ label: tl.labelId }));
    task.subtasks = subtasks.map((st: any) => ({ ...st, id: st._id.toString(), assignee: st.assigneeId }));
    task.comments = comments.map((c: any) => ({ ...c, id: c._id.toString(), author: c.authorId }));
    task.attachments = attachments.map((a: any) => ({ ...a, id: a._id.toString() }));
    task.activityLogs = activityLogs.map((al: any) => ({ ...al, id: al._id.toString(), user: al.userId }));
    task.approvals = approvals.map((a: any) => ({ ...a, id: a._id.toString(), submitter: a.submitterId, approver: a.approverId }));
    task.linkedTo = linkedTo.map((lt: any) => ({ ...lt, id: lt._id.toString(), targetTask: lt.targetTaskId }));
    task.linkedFrom = linkedFrom.map((lf: any) => ({ ...lf, id: lf._id.toString(), sourceTask: lf.sourceTaskId }));

    return NextResponse.json(task);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { userId, ...updateData } = await request.json();
    
    // Clean empty strings
    ['assigneeId', 'reporterId', 'teamId', 'categoryId'].forEach(f => { 
      if (updateData[f] === '') updateData[f] = null; 
    });

    const oldTask = await Task.findById(params.id).lean();
    const task = await Task.findByIdAndUpdate(params.id, updateData, { new: true }).lean();
    
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (userId && oldTask && oldTask.status !== task.status) {
      await ActivityLog.create({
        action: 'status_changed',
        details: JSON.stringify({ from: oldTask.status, to: task.status }),
        taskId: task._id,
        userId
      });
    }

    return NextResponse.json({ ...task, id: task._id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    await Task.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
