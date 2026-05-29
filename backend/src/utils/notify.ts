import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type NotifType =
  | 'assigned'
  | 'unassigned'
  | 'status_changed'
  | 'comment'
  | 'due_soon'
  | 'overdue'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'changes_requested';

export async function notify({
  userId,
  type,
  title,
  content,
  linkUrl,
}: {
  userId: string;
  type: NotifType;
  title: string;
  content: string;
  linkUrl?: string;
}) {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: { userId, type, title, content, linkUrl: linkUrl || null }
    });
  } catch (e) {
    console.error('[notify] failed to create notification', e);
  }
}
