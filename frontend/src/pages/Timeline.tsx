import { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { useSpace } from '../context/SpaceContext';

export default function Timeline() {
  const [tasks, setTasks] = useState<any[]>([]);
  const { selectedSpaceId } = useSpace();

  useEffect(() => {
    const url = selectedSpaceId ? `/tasks?spaceId=${selectedSpaceId}` : '/tasks';
    api.get(url).then(res => {
      // Filter only tasks with due dates and sort them
      const scheduled = res.data
        .filter((t: any) => t.dueDate)
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setTasks(scheduled);
    });
  }, [selectedSpaceId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Timeline</h1>
      
      <div className="relative border-l-2 border-border ml-4 space-y-8 pb-8">
        {tasks.map(task => (
          <div key={task.id} className="relative pl-6">
            <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-background"></div>
            <div className="bg-surface border border-border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold text-primary mb-1">
                    {new Date(task.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <Link to={`/task/${task.id}`} className="font-medium text-lg hover:underline">
                    {task.title}
                  </Link>
                </div>
                <span className="px-2 py-1 bg-background border border-border rounded text-xs text-textMuted">
                  {task.key}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-textMuted mt-4">
                <div>Assignee: <span className="text-text">{task.assignee?.name || 'Unassigned'}</span></div>
                <div>Status: <span className="text-text">{task.status}</span></div>
              </div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="pl-6 text-textMuted">No scheduled tasks found.</div>
        )}
      </div>
    </div>
  );
}
