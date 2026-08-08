import React, { useState, useEffect } from 'react';
import { ipcClient, ActivityLog } from '../../lib/ipc-client';

export const ActivityLogModule: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const fetchLogs = async () => {
    try {
      const data = await ipcClient.getActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    // In a real app we might set up an interval or Rust event listener here to auto-refresh
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-obsidian text-bone p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-medium tracking-wide">Activity Log</h1>
        <button onClick={fetchLogs} className="text-sm font-medium text-text-secondary hover:text-bone transition-colors">
          Refresh
        </button>
      </div>

      <div className="bg-surface-base border border-subtle rounded-lg flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-subtle bg-obsidian text-text-secondary text-sm">
              <th className="px-6 py-4 font-medium w-48">Timestamp</th>
              <th className="px-6 py-4 font-medium w-64">Action</th>
              <th className="px-6 py-4 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-subtle hover:bg-surface-raised transition-colors">
                <td className="px-6 py-3 whitespace-nowrap text-text-secondary font-mono text-sm">
                  {log.timestamp}
                </td>
                <td className="px-6 py-3 font-medium text-sm">
                  {log.action_type}
                </td>
                <td className="px-6 py-3 text-text-tertiary text-sm">
                  {log.details || '-'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-text-tertiary">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
