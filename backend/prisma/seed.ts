import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Clean up existing data
  await prisma.notification.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.linkedTask.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.category.deleteMany();
  await prisma.space.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);
  const superAdminPassword = await bcrypt.hash('SuperAdmin@2024!', 10);

  // 2. Create Users
  // ★ SuperAdmin — full system control
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@creativedesk.local',
      password: superAdminPassword,
      role: 'SuperAdmin',
      jobTitle: 'Platform Super Administrator',
      department: 'IT',
      availability: 'Available'
    }
  });

  const admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@creativedesk.local', password: defaultPassword, role: 'Admin', jobTitle: 'System Admin', department: 'IT', availability: 'Available' }
  });
  const manager1 = await prisma.user.create({
    data: { name: 'Sarah Manager', email: 'sarah@creativedesk.local', password: defaultPassword, role: 'Manager', jobTitle: 'Design Lead', department: 'Design', availability: 'Available' }
  });
  const designer1 = await prisma.user.create({
    data: { name: 'Alex Designer', email: 'alex@creativedesk.local', password: defaultPassword, role: 'Designer', jobTitle: 'UI Designer', department: 'Design', availability: 'Busy' }
  });
  const designer2 = await prisma.user.create({
    data: { name: 'Maria 3D', email: 'maria@creativedesk.local', password: defaultPassword, role: 'Designer', jobTitle: '3D Artist', department: 'Design', availability: 'Available' }
  });
  const designer3 = await prisma.user.create({
    data: { name: 'John Motion', email: 'john@creativedesk.local', password: defaultPassword, role: 'Designer', jobTitle: 'Motion Designer', department: 'Design', availability: 'Overloaded' }
  });
  const viewer = await prisma.user.create({
    data: { name: 'Client Viewer', email: 'client@creativedesk.local', password: defaultPassword, role: 'Viewer', jobTitle: 'Marketing', department: 'Marketing', availability: 'Available' }
  });

  const users = [admin, manager1, designer1, designer2, designer3, viewer];

  // 3. Create Teams
  const teamsData = [
    { name: 'Local Designers', type: 'Local' },
    { name: 'Content Team', type: 'Official' },
    { name: 'Ads Designers', type: 'Official' },
    { name: 'Email Designers', type: 'Official' },
    { name: 'International Designers', type: 'Official' },
    { name: '3D & Photo Retouching Team', type: 'Official' },
    { name: 'Motion Graphics Team', type: 'Official' }
  ];

  const teams = [];
  for (const t of teamsData) {
    teams.push(await prisma.team.create({ data: t }));
  }

  // 4. Assign Team Members
  await prisma.teamMember.create({ data: { userId: manager1.id, teamId: teams[0].id, isLead: true } });
  await prisma.teamMember.create({ data: { userId: designer1.id, teamId: teams[0].id } });
  await prisma.teamMember.create({ data: { userId: designer2.id, teamId: teams[5].id } });
  await prisma.teamMember.create({ data: { userId: designer3.id, teamId: teams[6].id } });

  // 5. Create Spaces
  const space1 = await prisma.space.create({ data: { name: 'Photo Retouching', key: 'PHOTOR', teamId: teams[0].id, leadId: manager1.id } });
  const space2 = await prisma.space.create({ data: { name: 'Campaigns', key: 'CAMP', teamId: teams[1].id, leadId: manager1.id } });

  // 6. Create Categories
  const categoriesData = [
    'Photo Retouching', '3D Render', 'Motion Graphic', 'Social Media Design',
    'Email Design', 'Website Banner', 'Product Image', 'Campaign Artwork',
    'Video Editing', 'Animation', 'Packaging Design', 'UI Design', 'Content Update', 'Other'
  ];
  const categories = [];
  for (const c of categoriesData) {
    categories.push(await prisma.category.create({ data: { name: c } }));
  }

  // 7. Create Labels
  const label1 = await prisma.label.create({ data: { name: 'Urgent', color: '#ef4444' } });
  const label2 = await prisma.label.create({ data: { name: 'Client Request', color: '#3b82f6' } });

  // 8. Create Tasks
  const taskNames = [
    'WBG Retouching',
    '3D Model and Finalize WBG Foot Luxuries Collection',
    'Image Retouching - Spa Shot',
    'WBG Retouch - Roll Ons',
    'Kesharaja - 3D Animation Video',
    'Tinted Lip Balms Retouch Changes',
    'Summer Campaign Home Banner',
    'Email Newsletter Artwork',
    'Product Image Cleanup'
  ];

  let taskCounter = 1;
  const tasks = [];
  for (const name of taskNames) {
    const isPhotor = name.includes('Retouch') || name.includes('WBG');
    const space = isPhotor ? space1 : space2;
    const category = categories.find(c => name.includes(c.name.split(' ')[0])) || categories[0];
    
    // Distribute statuses and priorities
    const statuses = ['To Do', 'In Progress', 'In Review', 'Approved', 'Done', 'Blocked'];
    const priorities = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
    
    const task = await prisma.task.create({
      data: {
        key: `${space.key}-${taskCounter++}`,
        title: name,
        description: `Please work on ${name}. Make sure to follow the brand guidelines.`,
        workType: 'Task',
        status: statuses[taskCounter % statuses.length],
        priority: priorities[taskCounter % priorities.length],
        spaceId: space.id,
        reporterId: manager1.id,
        assigneeId: designer1.id, // Just assigning to designer1 for simplicity, will mix below
        teamId: teams[0].id,
        categoryId: category.id,
        dueDate: new Date(Date.now() + (taskCounter * 24 * 60 * 60 * 1000)),
        startDate: new Date(),
        originalEstimate: 8,
        timeSpent: 2,
      }
    });
    tasks.push(task);
  }

  // Mix assignees
  await prisma.task.update({ where: { id: tasks[1].id }, data: { assigneeId: designer2.id, teamId: teams[5].id } });
  await prisma.task.update({ where: { id: tasks[4].id }, data: { assigneeId: designer3.id, teamId: teams[6].id } });
  await prisma.task.update({ where: { id: tasks[6].id }, data: { assigneeId: designer1.id, status: 'Done' } });

  // 9. Add Subtasks, Comments, Approvals
  const task1 = tasks[0];
  await prisma.subtask.create({
    data: {
      title: 'Initial cleanup',
      taskId: task1.id,
      assigneeId: designer1.id,
      status: 'Done'
    }
  });

  await prisma.comment.create({
    data: {
      content: 'I have started working on this.',
      taskId: task1.id,
      authorId: designer1.id
    }
  });

  await prisma.approval.create({
    data: {
      taskId: tasks[2].id,
      status: 'Pending Review',
      submitterId: designer1.id,
      approverId: manager1.id
    }
  });

  await prisma.activityLog.create({
    data: {
      action: 'status_changed',
      details: '{"from": "To Do", "to": "In Progress"}',
      taskId: task1.id,
      userId: designer1.id
    }
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });