import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|svg|mp4|mov|zip|ai|psd|sketch|figma|xd/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) return cb(null, true);
    cb(new Error('File type not allowed'));
  }
});

// List all attachments (for the Attachments gallery page)
router.get('/', async (req, res) => {
  const attachments = await prisma.attachment.findMany({
    include: { task: { include: { space: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(attachments);
});

// Upload file to a task
router.post('/task/:taskId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { taskId } = req.params;
    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        url: `/uploads/${req.file.filename}`
      }
    });
    res.json(attachment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Delete attachment
router.delete('/:id', async (req, res) => {
  try {
    const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (att) {
      const filePath = path.join(uploadsDir, path.basename(att.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await prisma.attachment.delete({ where: { id: req.params.id } });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

export default router;
