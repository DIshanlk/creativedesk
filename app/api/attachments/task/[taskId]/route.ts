import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db';
import Attachment from '@/lib/models/Attachment';
import { formatId } from '@/lib/formatMongo';

const uploadsDir = path.join(process.cwd(), 'uploads');

const ALLOWED = /jpeg|jpg|png|gif|webp|pdf|svg|mp4|mov|zip|ai|psd|sketch|figma|xd/i;

export async function POST(request: Request, { params }: { params: { taskId: string } }) {
  try {
    await dbConnect();
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED.test(ext) && !ALLOWED.test(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    const attachment = await Attachment.create({
      taskId: params.taskId,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      url: `/uploads/${filename}`,
    });

    return NextResponse.json(formatId(attachment.toJSON()));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
