"use client";
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Clock } from 'lucide-react';
import api from '@/lib/api';
import clsx from 'clsx';

interface Props {
  taskId: string;
  userId: string;
  timeSpent: number; // hours stored in DB
  estimate?: number; // originalEstimate hours
  onLogged: (newTimeSpent: number) => void;
}

export default function TimeTracker({ taskId, userId, timeSpent, estimate, onLogged }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [showManual, setShowManual] = useState(false);
  const [manualH, setManualH] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const format = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const stopAndLog = async () => {
    setRunning(false);
    if (elapsed < 60) { setElapsed(0); return; } // ignore < 1 min
    const hours = Math.round((elapsed / 3600) * 100) / 100;
    await logTime(hours, 'Timer session');
    setElapsed(0);
  };

  const logTime = async (hours: number, note: string) => {
    setSaving(true);
    try {
      const res = await api.post(`/tasks/${taskId}/log-time`, { hours, note, userId });
      onLogged(res.data.timeSpent);
    } catch { alert('Failed to log time'); }
    setSaving(false);
  };

  const logManual = async () => {
    const h = parseFloat(manualH);
    if (!h || h <= 0) return;
    await logTime(h, manualNote);
    setManualH(''); setManualNote(''); setShowManual(false);
  };

  const pct = estimate ? Math.min(Math.round((timeSpent / estimate) * 100), 100) : null;

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-textMuted">
          <Clock className="w-4 h-4" />
          <span>Logged: <span className="font-semibold text-text">{timeSpent}h</span></span>
        </div>
        {estimate && (
          <div className="text-textMuted">
            Estimate: <span className="font-semibold text-text">{estimate}h</span>
          </div>
        )}
        {pct !== null && (
          <div className={clsx('text-xs font-medium', pct >= 100 ? 'text-red-500' : pct >= 80 ? 'text-yellow-600' : 'text-green-600')}>
            {pct}% used
          </div>
        )}
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div className={clsx('h-full rounded-full transition-all', pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-green-500')}
            style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Timer */}
      <div className="flex items-center gap-2">
        <div className={clsx('font-mono text-sm px-3 py-1.5 rounded-lg border min-w-[90px] text-center transition-colors',
          running ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-textMuted')}>
          {format(elapsed)}
        </div>

        {!running ? (
          <button onClick={() => setRunning(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90">
            <Play className="w-3.5 h-3.5" /> Start Timer
          </button>
        ) : (
          <button onClick={stopAndLog} disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
            <Pause className="w-3.5 h-3.5" /> Stop & Log
          </button>
        )}

        <button onClick={() => setShowManual(v => !v)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg text-textMuted hover:bg-background hover:text-text">
          <Plus className="w-3.5 h-3.5" /> Log Manual
        </button>
      </div>

      {/* Manual log form */}
      {showManual && (
        <div className="flex gap-2 items-end">
          <div className="space-y-1">
            <label className="text-[10px] text-textMuted font-medium">Hours</label>
            <input type="number" min="0.1" step="0.5" value={manualH} onChange={e => setManualH(e.target.value)}
              placeholder="e.g. 2.5" className="w-24 px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div className="space-y-1 flex-1">
            <label className="text-[10px] text-textMuted font-medium">Note (optional)</label>
            <input value={manualNote} onChange={e => setManualNote(e.target.value)}
              placeholder="What did you work on?" className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <button onClick={logManual} disabled={saving}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {saving ? '…' : 'Log'}
          </button>
        </div>
      )}
    </div>
  );
}




