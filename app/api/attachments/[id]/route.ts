import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db';
import Attachment from '@/lib/models/Attachment';

const uploadsDir = path.join(process.cwd(), 'uploads');

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const att = await Attachment.findById(params.id);
    if (att) {
      const filePath = path.join(uploadsDir, path.basename(att.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await Attachment.findByIdAndDelete(params.id);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
