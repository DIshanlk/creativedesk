import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Approval from '@/lib/models/Approval';
import Task from '@/lib/models/Task';
import Notification from '@/lib/models/Notification';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { status, comment, approverId } = await request.json();
    
    const approval: any = await Approval.findByIdAndUpdate(
      params.id,
      { status, comment, approverId: approverId || undefined },
      { new: true }
    ).populate({
      path: 'taskId',
      populate: { path: 'spaceId' }
    }).populate('submitterId approverId').lean();

    if (!approval) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let newTaskStatus: string | null = null;
    if (status === 'Approved') newTaskStatus = 'Approved';
    if (status === 'Changes Requested') newTaskStatus = 'In Progress';
    
    if (newTaskStatus) {
      await Task.findByIdAndUpdate(approval.taskId._id, { status: newTaskStatus });
    }

    const typeMap: any = {
      'Approved': 'approval_approved',
      'Changes Requested': 'changes_requested',
      'Rejected': 'approval_rejected',
    };
    
    await Notification.create({
      userId: approval.submitterId._id,
      type: typeMap[status] || 'status_changed',
      title: `Your submission was ${status}`,
      content: `"${approval.taskId.title}" ${
        status === 'Approved' ? 'has been approved!' :
        status === 'Changes Requested' ? 'requires changes. Please review the feedback.' :
        'was rejected.'
      }${comment ? ' Note: ' + comment : ''}`,
      linkUrl: `/task/${approval.taskId._id}`
    });

    approval.id = approval._id.toString();
    approval.task = approval.taskId;
    approval.submitter = approval.submitterId;
    approval.approver = approval.approverId;

    return NextResponse.json(approval);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
  }
}
