"use client";
import { File, Folder, Plus } from 'lucide-react';

export default function Docs() {
  const docs = [
    { id: 1, name: 'Brand Guidelines 2026', type: 'doc', author: 'Sarah Manager', date: 'May 10, 2026' },
    { id: 2, name: 'Social Media Templates', type: 'folder', author: 'Alex Designer', date: 'May 15, 2026' },
    { id: 3, name: 'Email Newsletter Specs', type: 'doc', author: 'Sarah Manager', date: 'May 20, 2026' },
    { id: 4, name: '3D Render Requirements', type: 'doc', author: 'Maria 3D', date: 'May 22, 2026' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Docs</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Document
        </button>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-background text-textMuted">
            <tr>
              <th className="p-3 font-medium w-full">Name</th>
              <th className="p-3 font-medium">Author</th>
              <th className="p-3 font-medium">Last Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {docs.map(doc => (
              <tr key={doc.id} className="hover:bg-background cursor-pointer">
                <td className="p-3 flex items-center gap-3 font-medium">
                  {doc.type === 'folder' ? (
                    <Folder className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <File className="w-5 h-5 text-blue-500" />
                  )}
                  {doc.name}
                </td>
                <td className="p-3 text-textMuted">{doc.author}</td>
                <td className="p-3 text-textMuted">{doc.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




