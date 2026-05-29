import { useState, useEffect, useRef } from 'react';
import { X, Paperclip } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function CreateTaskModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess?: (task: any) => void }) {
  const [spaces, setSpaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('/reference/spaces'),
        api.get('/reference/categories'),
        api.get('/teams'),
        api.get('/people')
      ]).then(([s, c, t, u]) => {
        setSpaces(s.data);
        setCategories(c.data);
        setTeams(t.data);
        setUsers(u.data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await api.post('/tasks', data);
      const newTask = res.data;

      // Upload any pending files
      if (pendingFiles.length > 0) {
        await Promise.all(pendingFiles.map(file => {
          const fd = new FormData();
          fd.append('file', file);
          return api.post(`/attachments/task/${newTask.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        }));
      }

      if (data.createAnother) {
        e.target.reset();
        setPendingFiles([]);
      } else {
        onClose();
      }
      if (onSuccess) onSuccess(newTask);
    } catch (err: any) {
      alert('Failed to create task: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface w-full max-w-3xl rounded-lg shadow-xl border border-border flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
          <h2 className="text-xl font-bold">Create Task</h2>
          <button onClick={onClose} className="text-textMuted hover:text-text"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="create-task-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Space / Project <span className="text-red-500">*</span></label>
                <select name="spaceId" required className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  <option value="">Select space</option>
                  {spaces.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Work Type <span className="text-red-500">*</span></label>
                <select name="workType" required className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  <option value="Task">Task</option>
                  <option value="Sub-task">Sub-task</option>
                  <option value="Bug">Bug</option>
                  <option value="Request">Request</option>
                  <option value="Approval">Approval</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Summary <span className="text-red-500">*</span></label>
              <input type="text" name="title" required placeholder="What needs to be done?" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Description</label>
              <textarea name="description" rows={4} placeholder="Add details..." className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none resize-none"></textarea>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Status</label>
                <select name="status" defaultValue="To Do" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  {['To Do','In Progress','In Review','Approved','Done','Blocked'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Priority</label>
                <select name="priority" defaultValue="Medium" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  {['Highest','High','Medium','Low','Lowest'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Assignee</label>
                <select name="assigneeId" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  <option value="">Unassigned</option>
                  {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Reporter <span className="text-red-500">*</span></label>
                <select name="reporterId" required className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id} selected={u.id === currentUser?.id}>{u.name}{u.id === currentUser?.id ? ' (you)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Team</label>
                <select name="teamId" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  <option value="">No Team</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Category</label>
                <select name="categoryId" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none">
                  <option value="">No Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Start Date</label>
                <input type="date" name="startDate" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Due Date</label>
                <input type="date" name="dueDate" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Original Estimate (hrs)</label>
                <input type="number" name="originalEstimate" min="0" placeholder="e.g. 8" className="w-full p-2 bg-background border border-border rounded text-sm focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>

            {/* File attachments */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Attachments</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-background transition-colors"
              >
                <div className="flex items-center justify-center gap-2 text-sm text-textMuted">
                  <Paperclip className="w-4 h-4" />
                  <span>Click to attach files <span className="text-xs">(Images, PDFs, Design files — max 20MB each)</span></span>
                </div>
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                accept="image/*,.pdf,.mp4,.mov,.zip,.ai,.psd,.sketch,.xd,.fig"
                onChange={e => {
                  if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }} />
              {pendingFiles.length > 0 && (
                <div className="space-y-1">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-background border border-border rounded px-2.5 py-1.5">
                      <Paperclip className="w-3 h-3 text-textMuted shrink-0" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-textMuted shrink-0">{(f.size/1024/1024).toFixed(1)} MB</span>
                      <button type="button" onClick={() => setPendingFiles(p => p.filter((_, j) => j !== i))}
                        className="text-textMuted hover:text-red-500 shrink-0">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-border shrink-0 flex items-center justify-between bg-surface rounded-b-lg">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="createAnother" form="create-task-form" className="rounded border-border" />
            Create another
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-background rounded border border-border">Cancel</button>
            <button type="submit" form="create-task-form" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90">Create Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}
