import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const userId = req.query.userId as string;
  const where = userId ? { userId } : {};
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 30
  });
  res.json(notifications);
});

router.post('/read-all', async (req, res) => {
  const userId = req.body.userId as string;
  await prisma.notification.updateMany({ where: { userId }, data: { isRead: true } });
  res.json({ success: true });
});

router.post('/:id/read', async (req, res) => {
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true }
  });
  res.json(notification);
});

export default router;
