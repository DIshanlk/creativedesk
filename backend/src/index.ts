import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { notify } from './utils/notify';

import tasksRouter from './routes/tasks';
import peopleRouter from './routes/people';
import teamsRouter from './routes/teams';
import reportsRouter from './routes/reports';
import referenceRouter from './routes/reference';
import notificationsRouter from './routes/notifications';
import searchRouter from './routes/search';
import approvalsRouter from './routes/approvals';
import attachmentsRouter from './routes/attachments';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Serve React build in production ───────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_DIST = path.join(process.cwd(), '..', 'frontend', 'dist');
if (isProduction) {
  app.use(express.static(FRONTEND_DIST));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tasks', tasksRouter);
app.use('/api/people', peopleRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/reference', referenceRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// ── SPA fallback (must come AFTER all API routes) ─────────────
if (isProduction) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`✅ CreativeDesk running on http://localhost:${PORT}  [${isProduction ? 'production' : 'development'}]`);
  scheduleDueSoonCheck();
});

// ── Due-soon notification scheduler ───────────────────────────────────────────
async function runDueSoonCheck() {
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: in24h, lte: in48h },
      status: { notIn: ['Done', 'Approved'] }
    },
    include: { assignee: true, reporter: true }
  });

  for (const task of tasks) {
    const dueStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
    const targets = [task.assigneeId, task.reporterId].filter((id): id is string => !!id);
    const seen = new Set<string>();
    for (const uid of targets) {
      if (seen.has(uid)) continue;
      seen.add(uid);

      // Avoid duplicate due-soon notifications: check if we sent one in last 20 hours
      const existing = await prisma.notification.findFirst({
        where: {
          userId: uid,
          type: 'due_soon',
          linkUrl: `/task/${task.id}`,
          createdAt: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) }
        }
      });
      if (existing) continue;

      await notify({
        userId: uid,
        type: 'due_soon',
        title: 'Task due soon',
        content: `"${task.title}" is due on ${dueStr}. Make sure it's completed on time.`,
        linkUrl: `/task/${task.id}`
      });
    }
  }

  // Overdue notifications
  const overdue = await prisma.task.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { notIn: ['Done', 'Approved'] }
    },
    include: { assignee: true, reporter: true }
  });

  for (const task of overdue) {
    if (!task.assigneeId) continue;
    const existing = await prisma.notification.findFirst({
      where: {
        userId: task.assigneeId,
        type: 'overdue',
        linkUrl: `/task/${task.id}`,
        createdAt: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) }
      }
    });
    if (existing) continue;

    await notify({
      userId: task.assigneeId,
      type: 'overdue',
      title: 'Task is overdue',
      content: `"${task.title}" was due ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'recently'} and is still open.`,
      linkUrl: `/task/${task.id}`
    });
  }

  console.log(`[due-soon] checked ${tasks.length} upcoming, ${overdue.length} overdue tasks`);
}

function scheduleDueSoonCheck() {
  // Run immediately on startup, then every 6 hours
  runDueSoonCheck().catch(console.error);
  setInterval(() => runDueSoonCheck().catch(console.error), 6 * 60 * 60 * 1000);
}
