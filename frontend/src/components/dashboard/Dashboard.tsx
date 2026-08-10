import React, { useEffect, useState } from 'react';
import { ipcClient } from '../../lib/ipc-client';

export const Dashboard: React.FC = () => {
  const [credentialCount, setCredentialCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [dbHealth, setDbHealth] = useState<'checking' | 'ok' | 'error'>('checking');
  const [dbHealthDetails, setDbHealthDetails] = useState('');

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

        const income = await ipcClient.getIncomeEntries();
        const currentMonth = new Date().toISOString().slice(0, 7);
        const thisMonthIncome = income.filter(e => e.date.startsWith(currentMonth)).reduce((acc, e) => acc + e.amount, 0);
        setMonthlyIncome(thisMonthIncome);

        try {
          const integrity = await ipcClient.checkDbIntegrity();
          if (integrity.toLowerCase() === 'ok') {
            setDbHealth('ok');
          } else {
            setDbHealth('error');
            setDbHealthDetails(integrity);
          }
        } catch (e) {
          setDbHealth('error');
          setDbHealthDetails(String(e));
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    fetchCounts();
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-obsidian text-bone p-8">
      <h1 className="text-2xl font-medium tracking-wide mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-3 gap-6">
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

        <div className="bg-surface-base border border-subtle rounded-lg p-6">
          <h2 className="text-text-secondary text-sm font-medium tracking-wider mb-2">MONTHLY INCOME</h2>
          <div className="text-4xl font-light text-bone">${monthlyIncome.toFixed(2)}</div>
        </div>
      </div>
      
      <div className="mt-8 bg-surface-base border border-subtle rounded-lg p-6">
        <h2 className="text-text-secondary text-sm font-medium tracking-wider mb-4">SYSTEM HEALTH</h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${dbHealth === 'ok' ? 'bg-green-500' : dbHealth === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
          <span className="font-medium">
            Database Integrity: {dbHealth === 'checking' ? 'Checking...' : dbHealth === 'ok' ? 'OK' : 'ERROR'}
          </span>
        </div>
        {dbHealth === 'error' && (
          <div className="mt-4 p-4 bg-obsidian border border-red-900 text-red-400 font-mono text-sm rounded overflow-auto">
            {dbHealthDetails}
          </div>
        )}
      </div>
    </div>
  );
};
