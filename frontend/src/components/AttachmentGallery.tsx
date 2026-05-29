import { useState } from 'react';
import { Download, Trash2, X, ChevronLeft, ChevronRight, FileText, Film, Archive, File, Image } from 'lucide-react';
import clsx from 'clsx';
import { API_BASE_URL } from '../api';

interface Attachment { id: string; fileName: string; fileType: string; fileSize: number; url: string; createdAt: string; }

interface Props {
  attachments: Attachment[];
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

function isImage(a: Attachment) {
  return a.fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(a.fileName);
}
function isVideo(a: Attachment) {
  return a.fileType.startsWith('video/') || /\.(mp4|mov|avi|webm)$/i.test(a.fileName);
}
function isPdf(a: Attachment) {
  return a.fileType === 'application/pdf' || a.fileName.endsWith('.pdf');
}

function FileIcon({ att, size = 'md' }: { att: Attachment; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-4 h-4' : 'w-8 h-8';
  if (isImage(att)) return <Image className={clsx(cls, 'text-blue-400')} />;
  if (isVideo(att)) return <Film className={clsx(cls, 'text-purple-400')} />;
  if (isPdf(att)) return <FileText className={clsx(cls, 'text-red-400')} />;
  if (/\.(zip|rar|tar|gz)$/i.test(att.fileName)) return <Archive className={clsx(cls, 'text-yellow-500')} />;
  return <File className={clsx(cls, 'text-textMuted')} />;
}

function fileExt(att: Attachment) {
  return att.fileName.split('.').pop()?.toUpperCase() || 'FILE';
}

export default function AttachmentGallery({ attachments, canDelete, onDelete }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null); // index into attachments

  const images = attachments.filter(isImage);

  const openLightbox = (att: Attachment) => {
    const idx = images.findIndex(a => a.id === att.id);
    if (idx !== -1) setLightbox(idx);
  };

  const prev = () => setLightbox(i => (i !== null ? (i - 1 + images.length) % images.length : null));
  const next = () => setLightbox(i => (i !== null ? (i + 1) % images.length : null));

  // keyboard navigation
  const onKey = (e: React.KeyboardEvent) => {
    if (lightbox === null) return;
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') setLightbox(null);
  };

  if (attachments.length === 0) return null;

  // Group: images first, then documents/other
  const imageAtts = attachments.filter(isImage);
  const otherAtts = attachments.filter(a => !isImage(a));

  return (
    <div className="space-y-3" onKeyDown={onKey} tabIndex={-1}>
      {/* Image grid */}
      {imageAtts.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {imageAtts.map(att => (
            <div key={att.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-background cursor-zoom-in"
              onClick={() => openLightbox(att)}>
              <img src={`${API_BASE_URL}${att.url}`} alt={att.fileName}
                className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-1.5 opacity-0 group-hover:opacity-100">
                <span className="text-white text-[10px] font-medium truncate">{att.fileName}</span>
              </div>
              {canDelete && (
                <button
                  onClick={e => { e.stopPropagation(); onDelete?.(att.id); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Other files list */}
      {otherAtts.length > 0 && (
        <div className="space-y-1.5">
          {otherAtts.map(att => (
            <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-background group">
              {/* Thumbnail / icon */}
              {isVideo(att) ? (
                <div className="w-12 h-9 bg-black/5 dark:bg-white/5 rounded border border-border flex items-center justify-center shrink-0 relative overflow-hidden">
                  <video src={`${API_BASE_URL}${att.url}`} className="w-full h-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>
              ) : (
                <div className={clsx('w-10 h-10 rounded border flex items-center justify-center shrink-0',
                  isPdf(att) ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-background border-border')}>
                  <span className="text-[9px] font-bold text-textMuted">{fileExt(att)}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{att.fileName}</div>
                <div className="text-xs text-textMuted">{formatBytes(att.fileSize)} · {new Date(att.createdAt).toLocaleDateString()}</div>
              </div>

              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <a href={`${API_BASE_URL}${att.url}`} target="_blank" rel="noreferrer" download={att.fileName}
                  className="p-1.5 text-textMuted hover:text-primary rounded hover:bg-background" title="Download">
                  <Download className="w-4 h-4" />
                </a>
                {canDelete && (
                  <button onClick={() => onDelete?.(att.id)}
                    className="p-1.5 text-textMuted hover:text-red-500 rounded hover:bg-background" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && images[lightbox] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          {/* Close */}
          <button className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
            onClick={() => setLightbox(null)}>
            <X className="w-7 h-7" />
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button className="absolute left-4 text-white/70 hover:text-white z-10 p-2 hover:bg-white/10 rounded-full"
              onClick={e => { e.stopPropagation(); prev(); }}>
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={`${API_BASE_URL}${images[lightbox].url}`}
              alt={images[lightbox].fileName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-4">
              <span className="text-white/80 text-sm">{images[lightbox].fileName}</span>
              <span className="text-white/50 text-xs">{formatBytes(images[lightbox].fileSize)}</span>
              <a href={`${API_BASE_URL}${images[lightbox].url}`} download={images[lightbox].fileName}
                className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs hover:underline"
                onClick={e => e.stopPropagation()}>
                <Download className="w-3.5 h-3.5" /> Download
              </a>
              {canDelete && onDelete && (
                <button onClick={() => { onDelete(images[lightbox!].id); setLightbox(null); }}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-2 text-white/40 text-xs">{lightbox + 1} / {images.length}</div>
            )}
          </div>

          {/* Next */}
          {images.length > 1 && (
            <button className="absolute right-4 text-white/70 hover:text-white z-10 p-2 hover:bg-white/10 rounded-full"
              onClick={e => { e.stopPropagation(); next(); }}>
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
