import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const teams = await prisma.team.findMany({
    include: {
      members: { include: { user: true } },
      tasks: true
    }
  });

  const enrichedTeams = teams.map(team => {
    const activeTasks = team.tasks.filter(t => !['Done', 'Approved'].includes(t.status)).length;
    const completedTasks = team.tasks.filter(t => ['Done', 'Approved'].includes(t.status)).length;
    const lead = team.members.find(m => m.isLead)?.user || null;
    
    // Simple workload calculation based on members
    const capacity = team.members.length * 8; // 8 tasks per member
    const workloadPercentage = capacity > 0 ? Math.min(Math.round((activeTasks / capacity) * 100), 100) : 0;

    return {
      ...team,
      memberCount: team.members.length,
      lead,
      activeTasks,
      completedTasks,
      workloadPercentage
    };
  });

  res.json(enrichedTeams);
});

router.post('/', async (req, res) => {
  try {
    const { name, type } = req.body;
    const team = await prisma.team.create({
      data: { name, type },
      include: { members: true, tasks: true }
    });
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const { userId, isLead } = req.body;
    const member = await prisma.teamMember.create({
      data: {
        teamId: req.params.id,
        userId,
        isLead: isLead || false
      },
      include: { user: true }
    });
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

router.delete('/:teamId/members/:userId', async (req, res) => {
  try {
    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          teamId: req.params.teamId,
          userId: req.params.userId
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
