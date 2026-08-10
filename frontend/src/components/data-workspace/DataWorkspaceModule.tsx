import React, { useState, useEffect } from 'react';
import { ipcClient, DataImport } from '../../lib/ipc-client';
import { Plus, Search, SlidersHorizontal, ArrowLeft } from 'lucide-react';

export const DataWorkspaceModule: React.FC = () => {
  const [imports, setImports] = useState<DataImport[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [activeImport, setActiveImport] = useState<DataImport | null>(null);
  
  // Grid Data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [maskedColumns, setMaskedColumns] = useState<Set<string>>(new Set());
  const [droppedColumns, setDroppedColumns] = useState<Set<string>>(new Set());

  const fetchImports = async () => {
    try {
      const data = await ipcClient.getImports();
      setImports(data);
    } catch (err) {
      console.error('Failed to fetch imports:', err);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim()) return;
    try {
      const newImport = await ipcClient.importCsvFile(filePath);
      setImports([newImport, ...imports]);
      setFilePath('');
      setIsImporting(false);
    } catch (err) {
      console.error('Failed to import CSV:', err);
      alert('Failed to import CSV: ' + err);
    }
  };

  const loadGrid = async (imp: DataImport) => {
    try {
      const [cols, dataRows] = await ipcClient.getImportData(imp.internal_table_name);
      setHeaders(cols);
      setRows(dataRows);
      setActiveImport(imp);
      setMaskedColumns(new Set());
      setDroppedColumns(new Set());
    } catch (err) {
      console.error('Failed to load data grid:', err);
    }
  };

  const toggleMask = (col: string) => {
    setMaskedColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  const toggleDrop = (col: string) => {
    setDroppedColumns(prev => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  if (activeImport) {
    return (
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-8 md:pt-12 px-6 md:px-12 relative overflow-hidden">
        <button onClick={() => setActiveImport(null)} className="flex items-center gap-2 text-text-secondary hover:text-bone mb-8 transition-colors text-sm font-medium w-fit">
          <ArrowLeft size={16} />
          <span>Back to datasets</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-text-primary">{activeImport.source_filename}</h1>
          <p className="text-sm text-text-secondary font-mono">{activeImport.internal_table_name} · {activeImport.row_count} records</p>
        </div>

        <div className="border border-border-subtle rounded-xl flex-1 overflow-auto bg-surface-raised">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-obsidian border-b border-border-subtle sticky top-0 z-10">
                {headers.map(col => {
                  if (droppedColumns.has(col)) return null;
                  return (
                    <th key={col} className="px-6 py-4 font-semibold text-text-secondary border-r border-border-subtle last:border-r-0 tracking-wide text-xs uppercase">
                      <div className="flex items-center justify-between space-x-6">
                        <span>{col}</span>
                        <div className="flex space-x-3 text-[10px] font-semibold tracking-widest">
                          <button onClick={() => toggleMask(col)} className={maskedColumns.has(col) ? 'text-bone' : 'text-text-tertiary hover:text-text-primary'} title="Mask Column">
                            MASK
                          </button>
                          <button onClick={() => toggleDrop(col)} className="text-text-tertiary hover:text-text-primary" title="Drop Column">
                            DROP
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-border-subtle hover:bg-surface-raised-hover transition-colors">
                  {headers.map((col, cIdx) => {
                    if (droppedColumns.has(col)) return null;
                    const isMasked = maskedColumns.has(col);
                    const val = row[cIdx];
                    return (
                      <td key={cIdx} className="px-6 py-3 border-r border-border-subtle last:border-r-0 font-mono text-text-secondary">
                        {isMasked ? '****' : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length > 100 && (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-6 text-center text-text-tertiary text-xs">
                    Showing first 100 rows of {rows.length}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {droppedColumns.size > 0 && (
          <div className="mt-6 pt-6 border-t border-border-subtle text-sm flex gap-4 pb-12 items-center">
            <span className="text-text-secondary text-xs uppercase tracking-widest font-semibold">Dropped Fields:</span>
            {Array.from(droppedColumns).map(col => (
              <button key={col} onClick={() => toggleDrop(col)} className="px-3 py-1 bg-surface-raised border border-border-subtle rounded-lg hover:border-border-default transition-colors text-xs font-medium">
                Restore {col}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-full pt-8 md:pt-12 px-6 md:px-12 relative">
        {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Private Dataset</h3>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Data workspace</h1>
        </div>
        <button
          onClick={() => setIsImporting(!isImporting)}
          className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          <span>Import data</span>
        </button>
      </div>

      {isImporting && (
        <form onSubmit={handleImport} className="mb-8 flex flex-col sm:flex-row gap-4 p-6 border border-border-subtle rounded-xl bg-surface-raised">
          <input
            type="text"
            placeholder="Absolute path to CSV file..."
            value={filePath}
            onChange={e => setFilePath(e.target.value)}
            className="flex-1 bg-transparent border border-border-subtle rounded-lg px-4 py-2.5 text-sm focus:border-border-default focus:outline-none transition-colors"
          />
          <button type="submit" className="px-6 py-2.5 bg-bone text-obsidian rounded-lg font-medium hover:opacity-90 transition-opacity text-sm">
            Load file
          </button>
        </form>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Filter rows and fields"
            className="w-full bg-transparent border border-border-subtle rounded-xl py-3 pl-11 pr-4 text-text-primary focus:outline-none focus:border-border-default transition-colors text-sm"
          />
        </div>
        <button className="flex items-center justify-between gap-3 px-5 py-3 bg-transparent border border-border-subtle rounded-xl hover:border-border-default transition-colors text-sm font-medium">
          <SlidersHorizontal size={16} className="text-text-primary" />
          <span>Fields</span>
        </button>
      </div>

      {/* Datasets Table */}
      <div className="w-full pb-10 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-2 pb-4 border-b border-border-subtle">
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Entity</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Identifier</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Protection</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase text-right">Updated</div>
          </div>
          
          <div className="flex flex-col">
          {imports.length === 0 ? (
            <div className="text-center text-text-secondary mt-12">
              <p>No datasets found.</p>
            </div>
          ) : (
            imports.map(imp => {
              const d = new Date(imp.imported_at);
              const displayDate = isNaN(d.getTime()) ? imp.imported_at : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
              
              return (
                <div 
                  key={imp.id}
                  onClick={() => loadGrid(imp)}
                  className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center px-2 py-6 border-b border-border-subtle hover:bg-surface-raised transition-colors cursor-pointer group"
                >
                  <div className="font-semibold text-sm text-text-primary">{imp.source_filename.replace('.csv', '') || 'Dataset'}</div>
                  <div className="text-xs text-text-secondary font-mono tracking-tight">{imp.row_count} records</div>
                  <div>
                    <span className="inline-block border border-border-subtle rounded-full px-3 py-1 text-[11px] text-text-secondary font-medium transition-colors group-hover:border-border-default tracking-widest uppercase">
                      Encrypted
                    </span>
                  </div>
                  <div className="text-sm font-semibold font-mono text-right text-text-secondary tracking-tight">
                    {displayDate || 'Today'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
    </div>
    </div>
  );
};
