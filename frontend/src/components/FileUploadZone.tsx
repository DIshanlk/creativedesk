import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Paperclip } from 'lucide-react';
import clsx from 'clsx';
import api from '../api';

interface Props {
  taskId: string;
  onUploaded: (attachment: any) => void;
  compact?: boolean;
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'video/mp4', 'video/quicktime',
  'application/zip', 'application/x-zip-compressed',
  'application/postscript',                   // .ai
  'image/vnd.adobe.photoshop',                // .psd
  'application/octet-stream',                 // .sketch, .xd, .fig
];

const MAX_SIZE_MB = 20;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileUploadZone({ taskId, onUploaded, compact }: Props) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState<{ name: string; progress: number; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Paste from clipboard (ctrl+v screenshots)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter(i => i.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      e.preventDefault();
      imageItems.forEach(item => {
        const file = item.getAsFile();
        if (file) {
          const renamed = new File([file], `pasted-image-${Date.now()}.png`, { type: file.type });
          uploadFile(renamed);
        }
      });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [taskId]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) return `File too large (max ${MAX_SIZE_MB} MB)`;
    return null;
  };

  const uploadFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    const entry = { name: file.name, progress: 0, error: error || undefined };
    if (error) {
      setQueue(q => [...q, entry]);
      setTimeout(() => setQueue(q => q.filter(x => x.name !== file.name)), 4000);
      return;
    }

    setQueue(q => [...q, { name: file.name, progress: 10 }]);
    setUploading(true);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await api.post(`/attachments/task/${taskId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / (e.total || 1)) * 90);
          setQueue(q => q.map(x => x.name === file.name ? { ...x, progress: pct } : x));
        }
      });
      setQueue(q => q.map(x => x.name === file.name ? { ...x, progress: 100 } : x));
      onUploaded(res.data);
      setTimeout(() => setQueue(q => q.filter(x => x.name !== file.name)), 1500);
    } catch (err: any) {
      setQueue(q => q.map(x => x.name === file.name ? { ...x, progress: 0, error: err.response?.data?.error || 'Upload failed' } : x));
      setTimeout(() => setQueue(q => q.filter(x => x.name !== file.name)), 4000);
    } finally {
      setUploading(false);
    }
  }, [taskId, onUploaded]);

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach(uploadFile);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  if (compact) {
    return (
      <div>
        <div
          onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-background'
          )}
        >
          <div className="flex items-center justify-center gap-2 text-xs text-textMuted">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Drop files here, click to browse, or <kbd className="text-[10px] bg-background border border-border rounded px-1 py-0.5">Ctrl+V</kbd> to paste</span>
          </div>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)} />
        {queue.length > 0 && <ProgressList queue={queue} />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-background'
        )}
      >
        <Upload className={clsx('w-10 h-10 mx-auto mb-3 transition-colors', dragging ? 'text-primary' : 'text-textMuted')} />
        <div className="text-sm font-medium mb-1">{dragging ? 'Drop files here' : 'Drag & drop files here'}</div>
        <div className="text-xs text-textMuted mb-3">or click to browse · or <kbd className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px]">Ctrl+V</kbd> to paste a screenshot</div>
        <div className="text-[10px] text-textMuted">
          Supports: Images (JPG, PNG, GIF, WebP, SVG) · PDFs · Videos (MP4, MOV) · Design files (AI, PSD, Sketch, Figma, XD) · ZIP · Max {MAX_SIZE_MB} MB per file
        </div>
      </div>
      <input ref={fileInputRef} type="file" multiple className="hidden"
        accept="image/*,.pdf,.mp4,.mov,.zip,.ai,.psd,.sketch,.xd,.fig"
        onChange={e => e.target.files && handleFiles(e.target.files)} />
      {queue.length > 0 && <ProgressList queue={queue} />}
    </div>
  );
}

function ProgressList({ queue }: { queue: { name: string; progress: number; error?: string }[] }) {
  return (
    <div className="space-y-1.5 mt-2">
      {queue.map(item => (
        <div key={item.name} className={clsx('rounded-lg p-2.5 text-xs border', item.error ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-background border-border')}>
          <div className="flex justify-between mb-1">
            <span className="truncate max-w-[200px] font-medium">{item.name}</span>
            <span className={item.error ? 'text-red-500' : item.progress === 100 ? 'text-green-600' : 'text-textMuted'}>
              {item.error ? '✗ ' + item.error : item.progress === 100 ? '✓ Done' : `${item.progress}%`}
            </span>
          </div>
          {!item.error && (
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div className={clsx('h-full transition-all', item.progress === 100 ? 'bg-green-500' : 'bg-primary')}
                style={{ width: `${item.progress}%` }}></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
