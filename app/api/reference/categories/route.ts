import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/lib/models/Category';

export async function GET() {
  try {
    await dbConnect();
    const categories = await Category.find().lean();
    return NextResponse.json(categories.map((c: any) => ({ ...c, id: c._id.toString() })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
