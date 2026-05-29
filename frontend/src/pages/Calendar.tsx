import { useEffect, useState } from 'react';
import api from '../api';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useSpace } from '../context/SpaceContext';

export default function Calendar() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const { selectedSpaceId } = useSpace();

  useEffect(() => {
    const url = selectedSpaceId ? `/tasks?spaceId=${selectedSpaceId}` : '/tasks';
    api.get(url).then(res => setTasks(res.data));
  }, [selectedSpaceId]);

  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.startOf('month').day();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getStatusBgColor = (status: string) => {
    const map: Record<string, string> = {
      'Done': '#22c55e',
      'Approved': '#10b981',
      'Blocked': '#ef4444',
      'In Progress': '#3b82f6',
      'In Review': '#a855f7',
      'To Do': '#94a3b8',
    };
    return map[status] || '#94a3b8';
  };

  const scheduledTasks = tasks.filter(t => t.dueDate);
  const unscheduledTasks = tasks.filter(t => !t.dueDate);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))} className="px-3 py-1 bg-surface border border-border rounded hover:bg-background">&lt;</button>
          <div className="px-4 py-1 font-semibold">{currentDate.format('MMMM YYYY')}</div>
          <button onClick={() => setCurrentDate(currentDate.add(1, 'month'))} className="px-3 py-1 bg-surface border border-border rounded hover:bg-background">&gt;</button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col bg-surface border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-background">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="p-2 text-center text-sm font-medium text-textMuted">{d}</div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-5">
            {blanks.map(b => (
              <div key={`blank-${b}`} className="border-r border-b border-border bg-background/50 p-1"></div>
            ))}
            {days.map(day => {
              const dateStr = currentDate.date(day).format('YYYY-MM-DD');
              const dayTasks = scheduledTasks.filter(t => dayjs(t.dueDate).format('YYYY-MM-DD') === dateStr);
              
              return (
                <div key={day} className="border-r border-b border-border p-1 overflow-y-auto">
                  <div className="text-right text-sm text-textMuted mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayTasks.map(task => (
                      <Link
                        key={task.id}
                        to={`/task/${task.id}`}
                        className="block text-xs truncate px-1.5 py-0.5 rounded text-white font-medium"
                        style={{ backgroundColor: getStatusBgColor(task.status) }}
                        title={task.title}
                      >
                        {task.title}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unscheduled Side Panel */}
        <div className="w-64 bg-surface border border-border rounded-lg flex flex-col shrink-0">
          <div className="p-3 border-b border-border font-semibold">Unscheduled</div>
          <div className="p-3 flex-1 overflow-y-auto space-y-2">
            {unscheduledTasks.map(task => (
              <div key={task.id} className="p-2 border border-border rounded text-sm bg-background">
                <Link to={`/task/${task.id}`} className="font-medium hover:text-primary block truncate">{task.key}</Link>
                <div className="text-xs text-textMuted truncate">{task.title}</div>
              </div>
            ))}
            {unscheduledTasks.length === 0 && (
              <div className="text-sm text-textMuted text-center mt-4">All tasks scheduled</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
