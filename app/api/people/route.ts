import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/lib/models/User';
import TeamMember from '@/lib/models/TeamMember';
import Task from '@/lib/models/Task';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find().lean();
    
    // We need to fetch teamMembers and assignedTasks for each user
    const enrichedUsers = await Promise.all(users.map(async (user: any) => {
      const teamMembers = await TeamMember.find({ userId: user._id }).populate('teamId').lean();
      const activeTasksCount = await Task.countDocuments({ 
        assigneeId: user._id, 
        status: { $nin: ['Done', 'Approved'] } 
      });
      
      const isOverloaded = activeTasksCount > 8;
      const availability = isOverloaded ? 'Overloaded' : user.availability;
      
      user.id = user._id.toString();
      delete user._id;
      delete user.__v;
      delete user.password;
      
      return {
        ...user,
        teamMembers: teamMembers.map((m: any) => ({
          ...m,
          id: m._id?.toString(),
          team: m.teamId ? { ...m.teamId, id: m.teamId._id?.toString() } : null,
        })),
        activeTasksCount,
        availability,
        workloadPercentage: Math.min(Math.round((activeTasksCount / 8) * 100), 100)
      };
    }));

    return NextResponse.json(enrichedUsers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { name, email, role, jobTitle, department, location, password: rawPw } = await request.json();
    
    const existing = await User.findOne({ email });
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 400 });

    const hashed = await bcrypt.hash(rawPw || 'password123', 10);
    const user = await User.create({
      name, email, role, jobTitle, department, location, password: hashed, availability: 'Available'
    });
    
    const userObj = user.toJSON();
    delete userObj.password;
    
    return NextResponse.json(userObj);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
