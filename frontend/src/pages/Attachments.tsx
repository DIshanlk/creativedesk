import { useEffect, useState } from 'react';
import api, { API_BASE_URL } from '../api';
import { Link } from 'react-router-dom';
import { Download, FileText, Image, Film, Archive, File } from 'lucide-react';

const API_BASE = API_BASE_URL;

function getFileIcon(fileType: string, fileName: string) {
  if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName)) return Image;
  if (fileType.startsWith('video/') || /\.(mp4|mov|avi)$/i.test(fileName)) return Film;
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) return FileText;
  if (/\.(zip|rar|tar|gz)$/i.test(fileName)) return Archive;
  return File;
}

function isImage(fileType: string, fileName: string) {
  return fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
}

export default function Attachments() {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSpace, setFilterSpace] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    api.get('/attachments').then(res => setAttachments(res.data)).finally(() => setLoading(false));
  }, []);

  const spaces = [...new Set(attachments.map(a => a.task?.space?.name).filter(Boolean))];
  const filtered = attachments.filter(a => {
    if (filterSpace && a.task?.space?.name !== filterSpace) return false;
    if (filterType === 'image' && !isImage(a.fileType, a.fileName)) return false;
    if (filterType === 'document' && isImage(a.fileType, a.fileName)) return false;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-textMuted">Loading attachments...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">Attachments</h1>
        <div className="flex gap-2">
          <select value={filterSpace} onChange={e => setFilterSpace(e.target.value)}
            className="p-2 bg-surface border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Spaces</option>
            {spaces.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="p-2 bg-surface border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary">
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center bg-surface border border-border rounded-lg text-textMuted">
          {attachments.length === 0 ? 'No files uploaded yet. Upload files from any task detail page.' : 'No files match the selected filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(att => {
            const img = isImage(att.fileType, att.fileName);
            const FileIcon = getFileIcon(att.fileType, att.fileName);
            const sizeMB = (att.fileSize / 1024 / 1024).toFixed(1);
            return (
              <div key={att.id} className="bg-surface border border-border rounded-lg overflow-hidden group hover:shadow-md transition-shadow">
                {/* Preview */}
                <div className="h-32 flex items-center justify-center bg-background relative overflow-hidden">
                  {img ? (
                    <img src={`${API_BASE}${att.url}`} alt={att.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon className="w-12 h-12 text-textMuted opacity-40" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a href={`${API_BASE}${att.url}`} download={att.fileName} target="_blank" rel="noreferrer"
                      className="p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {/* Info */}
                <div className="p-2">
                  <div className="text-xs font-medium truncate" title={att.fileName}>{att.fileName}</div>
                  <div className="text-[10px] text-textMuted mt-0.5 flex justify-between">
                    <span>{sizeMB} MB</span>
                    <Link to={`/task/${att.task?.id}`} className="hover:text-primary truncate max-w-[60px]">
                      {att.task?.key}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
