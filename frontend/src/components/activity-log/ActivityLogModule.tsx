import React, { useState, useEffect, useMemo } from 'react';
import { ipcClient, ActivityLog } from '../../lib/ipc-client';
import { Plus, Unlock, Lock, FilePlus, Download, FileEdit, Info } from 'lucide-react';

// Helper to determine icon based on action type
const getIconForAction = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('unlock')) return <Unlock size={18} className="text-text-secondary" />;
  if (lower.includes('lock')) return <Lock size={18} className="text-text-secondary" />;
  if (lower.includes('create') || lower.includes('add')) return <FilePlus size={18} className="text-text-secondary" />;
  if (lower.includes('export') || lower.includes('backup')) return <Download size={18} className="text-text-secondary" />;
  if (lower.includes('update') || lower.includes('edit')) return <FileEdit size={18} className="text-text-secondary" />;
  return <Info size={18} className="text-text-secondary" />;
};

// Group logs by day
const groupLogsByDate = (logs: ActivityLog[]) => {
  const groups: { [key: string]: ActivityLog[] } = {};
  
  logs.forEach(log => {
    // Basic date parsing from timestamp (assuming ISO-like or parseable date)
    const d = new Date(log.timestamp);
    if (isNaN(d.getTime())) {
      // Fallback if parsing fails
      if (!groups['OLDER']) groups['OLDER'] = [];
      groups['OLDER'].push(log);
      return;
    }
    
    // Check if today or yesterday
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateLabel = '';
    const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: '2-digit' }).toUpperCase();
    
    if (d.toDateString() === today.toDateString()) {
      dateLabel = `TODAY · ${dateStr}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      dateLabel = `YESTERDAY · ${dateStr}`;
    } else {
      dateLabel = dateStr;
    }
    
    if (!groups[dateLabel]) groups[dateLabel] = [];
    groups[dateLabel].push(log);
  });
  
  return groups;
};

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
  }, []);

  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-full pt-8 md:pt-12 px-6 md:px-12 relative pb-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Vault History</h3>
            <h1 className="text-4xl font-bold text-text-primary tracking-tight">Activity</h1>
          </div>
          <button className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity">
            <Plus size={18} />
            <span>Export log</span>
          </button>
        </div>

        {/* Activity List */}
        <div className="flex flex-col space-y-10">
          {Object.keys(groupedLogs).length === 0 ? (
             <div className="text-center text-text-secondary mt-12">
               <p>No activity recorded yet.</p>
             </div>
          ) : (
            Object.entries(groupedLogs).map(([dateLabel, dayLogs]) => (
              <div key={dateLabel}>
                <div className="text-[10px] font-semibold text-text-tertiary tracking-widest uppercase mb-4 border-b border-border-subtle pb-4">
                  {dateLabel}
                </div>
                <div className="flex flex-col">
                  {dayLogs.map(log => {
                    const time = new Date(log.timestamp);
                    const timeStr = isNaN(time.getTime()) ? '' : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                    
                    return (
                      <div key={log.id} className="flex justify-between py-6 border-b border-border-subtle last:border-b-0 hover:bg-surface-raised transition-colors group px-2 -mx-2 rounded-lg">
                        <div className="flex items-start gap-5">
                          <div className="mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {getIconForAction(log.action_type)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-text-primary mb-2.5 tracking-tight">{log.action_type}</div>
                            <div className="text-sm text-text-secondary">{log.details || 'No details provided.'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-text-tertiary font-mono tracking-tight mt-0.5">
                          {timeStr}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
