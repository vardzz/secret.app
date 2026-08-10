import React, { useState, useEffect, useMemo } from 'react';
import { ipcClient, IncomeEntry } from '../../lib/ipc-client';
import { Plus } from 'lucide-react';

export const IncomeModule: React.FC = () => {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState(''); // We'll use notes for "description" in the UI

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
      const entry = await ipcClient.createIncomeEntry(Number(amount), currency, date, category || 'Income', notes);
      setEntries([entry, ...entries]);
      setAmount('');
      setNotes('');
      setCategory('');
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to create income entry:', err);
    }
  };

  const { totalAllTime, totalThisMonth } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let allTime = 0;
    let thisMonth = 0;
    entries.forEach((e) => {
      allTime += e.amount;
      if (e.date.startsWith(currentMonth)) {
        thisMonth += e.amount;
      }
    });
    return { totalAllTime: allTime, totalThisMonth: thisMonth };
  }, [entries]);

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-8 md:pt-12 px-6 md:px-12 relative overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Financial Log</h3>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Income</h1>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          <span>Add income</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border border-border-subtle rounded-xl bg-surface-raised">
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary tracking-widest uppercase mb-2">Description</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} required placeholder="e.g. Northstar Studio"
              className="w-full bg-transparent border border-border-subtle rounded-lg px-3 py-2 text-sm focus:border-border-default focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary tracking-widest uppercase mb-2">Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g. Consulting"
              className="w-full bg-transparent border border-border-subtle rounded-lg px-3 py-2 text-sm focus:border-border-default focus:outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary tracking-widest uppercase mb-2">Amount</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="8240.00"
              className="w-full bg-transparent border border-border-subtle rounded-lg px-3 py-2 text-sm focus:border-border-default focus:outline-none transition-colors" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-bone text-obsidian rounded-lg py-2 font-medium hover:opacity-90 transition-opacity">
              Save record
            </button>
          </div>
        </form>
      )}

      {/* Metrics Row */}
      <div className="flex flex-col sm:flex-row border-y border-border-subtle mb-10">
        <div className="flex-1 py-6 px-6 sm:first:pl-2 border-b sm:border-b-0 sm:border-r border-border-subtle">
          <h4 className="text-sm text-text-primary mb-5">This month</h4>
          <div className="text-3xl font-bold font-mono tracking-tight">${totalThisMonth.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
        </div>
        <div className="flex-1 py-6 px-6 border-b sm:border-b-0 sm:border-r border-border-subtle">
          <h4 className="text-sm text-text-primary mb-5">All time</h4>
          <div className="text-3xl font-bold font-mono tracking-tight">${totalAllTime.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
        </div>
        <div className="flex-1 py-6 px-6">
          <h4 className="text-sm text-text-primary mb-5">Total entries</h4>
          <div className="text-3xl font-bold font-mono tracking-tight">{entries.length}</div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="w-full pb-10 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[1fr_2fr_1fr_1fr] px-2 pb-4 border-b border-border-subtle">
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Date</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Description</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Category</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase text-right">Amount</div>
          </div>
          
          <div className="flex flex-col">
          {entries.length === 0 ? (
            <div className="text-center text-text-secondary mt-12">
              <p>No income records found.</p>
            </div>
          ) : (
            entries.map(entry => {
              // Parse date "YYYY-MM-DD" to "AUG 07"
              const d = new Date(entry.date);
              const displayDate = isNaN(d.getTime()) ? entry.date : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
              
              return (
                <div 
                  key={entry.id}
                  className="grid grid-cols-[1fr_2fr_1fr_1fr] items-center px-2 py-6 border-b border-border-subtle hover:bg-surface-raised transition-colors group"
                >
                  <div className="text-xs text-text-secondary font-mono tracking-tight">{displayDate}</div>
                  <div className="font-semibold text-sm text-text-primary truncate pr-4">{entry.notes || 'Unnamed record'}</div>
                  <div>
                    <span className="inline-block border border-border-subtle rounded-full px-3 py-1 text-[11px] text-text-secondary font-medium transition-colors group-hover:border-border-default">
                      {entry.category}
                    </span>
                  </div>
                  <div className="text-sm font-semibold font-mono text-right tracking-tight">
                    ${entry.amount.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    </div>
  );
};
