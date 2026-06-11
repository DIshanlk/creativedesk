import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'uploads');

export async function GET(_request: Request, { params }: { params: { path: string[] } }) {
  const filePath = path.join(uploadsDir, ...params.path);
  if (!filePath.startsWith(uploadsDir) || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.mov': 'video/quicktime',
    '.zip': 'application/zip',
  };

  return new NextResponse(buffer, {
    headers: { 'Content-Type': types[ext] || 'application/octet-stream' },
  });
}
