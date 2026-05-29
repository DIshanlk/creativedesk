import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const q = req.query.q as string;
  if (!q) return res.json({ tasks: [], people: [], teams: [] });

  const [tasks, people, teams] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { key: { contains: q } }
        ]
      },
      take: 5
    }),
    prisma.user.findMany({
      where: { name: { contains: q } },
      take: 5
    }),
    prisma.team.findMany({
      where: { name: { contains: q } },
      take: 5
    })
  ]);

  res.json({ tasks, people, teams });
});

export default router;
