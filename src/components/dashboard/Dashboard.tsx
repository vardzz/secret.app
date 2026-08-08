import React, { useEffect, useState } from 'react';
import { ipcClient } from '../../lib/ipc-client';

export const Dashboard: React.FC = () => {
  const [credentialCount, setCredentialCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const credentials = await ipcClient.getCredentials();
        setCredentialCount(credentials.length);

        const notes = await ipcClient.getNotes();
        setNoteCount(notes.length);

        const tasks = await ipcClient.getTasks();
        const activeTasks = tasks.filter(t => t.status === 'To Do' || t.status === 'In Progress');
        setActiveTaskCount(activeTasks.length);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    fetchCounts();
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-obsidian text-bone p-8">
      <h1 className="text-2xl font-medium tracking-wide mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-base border border-subtle rounded-lg p-6">
          <h2 className="text-text-secondary text-sm font-medium tracking-wider mb-2">VAULT CREDENTIALS</h2>
          <div className="text-4xl font-light text-bone">{credentialCount}</div>
        </div>
        
        <div className="bg-surface-base border border-subtle rounded-lg p-6">
          <h2 className="text-text-secondary text-sm font-medium tracking-wider mb-2">NOTES</h2>
          <div className="text-4xl font-light text-bone">{noteCount}</div>
        </div>
        
        <div className="bg-surface-base border border-subtle rounded-lg p-6">
          <h2 className="text-text-secondary text-sm font-medium tracking-wider mb-2">ACTIVE TASKS</h2>
          <div className="text-4xl font-light text-bone">{activeTaskCount}</div>
        </div>
      </div>
    </div>
  );
};
