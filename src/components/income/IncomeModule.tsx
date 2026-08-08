import React, { useState, useEffect, useMemo } from 'react';
import { ipcClient, IncomeEntry } from '../../lib/ipc-client';

export const IncomeModule: React.FC = () => {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Salary');
  const [notes, setNotes] = useState('');

  const fetchEntries = async () => {
    try {
      const data = await ipcClient.getIncomeEntries();
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch income entries:', err);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    try {
      const entry = await ipcClient.createIncomeEntry(Number(amount), currency, date, category, notes);
      setEntries([entry, ...entries]);
      setAmount('');
      setNotes('');
    } catch (err) {
      console.error('Failed to create income entry:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ipcClient.deleteIncomeEntry(id);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete income entry:', err);
    }
  };

  const { totalAllTime, totalThisMonth } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let allTime = 0;
    let thisMonth = 0;
    entries.forEach((e) => {
      // Assuming all are the same currency for simplicity in this MVP view
      allTime += e.amount;
      if (e.date.startsWith(currentMonth)) {
        thisMonth += e.amount;
      }
    });
    return { totalAllTime: allTime, totalThisMonth: thisMonth };
  }, [entries]);

  return (
    <div className="flex h-full w-full bg-obsidian text-bone">
      {/* Sidebar: Form & Stats */}
      <div className="w-80 border-r border-subtle bg-surface-base flex flex-col">
        <div className="p-6 border-b border-subtle">
          <h2 className="text-xl font-medium mb-6">Add Income</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
                className="w-full bg-transparent border border-subtle rounded px-3 py-2 focus:border-bone focus:outline-none" />
            </div>
            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                  className="w-full bg-transparent border border-subtle rounded px-3 py-2 focus:border-bone focus:outline-none" />
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-medium text-text-secondary mb-1">Curr.</label>
                <input type="text" value={currency} onChange={e => setCurrency(e.target.value)} required
                  className="w-full bg-transparent border border-subtle rounded px-3 py-2 focus:border-bone focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} required
                className="w-full bg-transparent border border-subtle rounded px-3 py-2 focus:border-bone focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full bg-transparent border border-subtle rounded px-3 py-2 focus:border-bone focus:outline-none" />
            </div>
            <button type="submit" className="w-full bg-bone text-obsidian rounded py-2 font-medium hover:opacity-90">
              Record Income
            </button>
          </form>
        </div>
        
        <div className="p-6 space-y-4 flex-1">
          <div>
            <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">This Month</h3>
            <div className="text-3xl font-light">${totalThisMonth.toFixed(2)}</div>
          </div>
          <div>
            <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">All Time</h3>
            <div className="text-3xl font-light">${totalAllTime.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Main View: Ledger */}
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-medium tracking-wide mb-6">Income Ledger</h1>
        
        <div className="bg-surface-base border border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-subtle bg-obsidian text-text-secondary text-sm">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-subtle hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{entry.date}</td>
                  <td className="px-4 py-3">
                    <span className="bg-obsidian border border-subtle text-bone px-2 py-1 rounded text-xs">
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {entry.amount.toFixed(2)} <span className="text-text-tertiary font-normal text-sm">{entry.currency}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary truncate max-w-xs">{entry.notes}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(entry.id)} className="text-text-tertiary hover:text-text-primary text-xs uppercase tracking-wider">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-tertiary">
                    No income records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
