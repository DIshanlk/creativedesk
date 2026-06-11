"use client";
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

export default function Archived() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    api.get('/tasks').then(res => {
      const archived = res.data.filter((t: any) => ['Done', 'Approved'].includes(t.status));
      setTasks(archived);
    });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Archived Work Items</h1>
      <p className="text-textMuted text-sm">Showing tasks that are marked as Done or Approved.</p>

      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-background text-textMuted">
            <tr>
              <th className="p-3 font-medium">Key</th>
              <th className="p-3 font-medium w-full">Title</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Completed Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map(task => (
              <tr key={task.id} className="hover:bg-background opacity-75 hover:opacity-100 transition-opacity">
                <td className="p-3">
                  <Link href={`/task/${task.id}`} className="text-primary hover:underline">{task.key}</Link>
                </td>
                <td className="p-3 font-medium line-through decoration-textMuted">{task.title}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {task.status}
                  </span>
                </td>
                <td className="p-3 text-textMuted">
                  {new Date(task.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-textMuted">No archived tasks found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}




