import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/spaces', async (req, res) => {
  const spaces = await prisma.space.findMany({
    include: { team: true, lead: true }
  });
  res.json(spaces);
});

router.post('/spaces', async (req, res) => {
  try {
    const { name, key, teamId, leadId } = req.body;
    const space = await prisma.space.create({
      data: { name, key, teamId, leadId },
      include: { team: true, lead: true }
    });
    res.json(space);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create space' });
  }
});

router.get('/categories', async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

router.get('/labels', async (req, res) => {
  const labels = await prisma.label.findMany();
  res.json(labels);
});

export default router;
