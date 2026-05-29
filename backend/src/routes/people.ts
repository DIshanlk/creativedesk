import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      teamMembers: { include: { team: true } },
      assignedTasks: { where: { status: { notIn: ['Done', 'Approved'] } } }
    }
  });

  const enrichedUsers = users.map(user => {
    const activeTasksCount = user.assignedTasks.length;
    const isOverloaded = activeTasksCount > 8;
    const availability = isOverloaded ? 'Overloaded' : user.availability;
    const { password: _, ...rest } = user as any;
    return {
      ...rest,
      activeTasksCount,
      availability,
      workloadPercentage: Math.min(Math.round((activeTasksCount / 8) * 100), 100)
    };
  });

  res.json(enrichedUsers);
});

// Create new user (Admin only)
router.post('/', async (req, res) => {
  try {
    const { name, email, role, jobTitle, department, location, password: rawPw } = req.body;
    const hashed = await bcrypt.hash(rawPw || 'password123', 10);
    const user = await prisma.user.create({
      data: { name, email, role, jobTitle, department, location, password: hashed, availability: 'Available' }
    });
    const { password: _, ...rest } = user as any;
    res.json(rest);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.patch('/:id', async (req, res) => {
  try {
    const { password: rawPw, ...data } = req.body;
    const updateData: any = { ...data };
    if (rawPw) updateData.password = await bcrypt.hash(rawPw, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData });
    const { password: _, ...rest } = user as any;
    res.json(rest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
