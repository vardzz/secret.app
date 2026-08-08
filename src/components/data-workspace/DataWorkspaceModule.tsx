import React, { useState, useEffect } from 'react';
import { ipcClient, DataImport } from '../../lib/ipc-client';

export const DataWorkspaceModule: React.FC = () => {
  const [imports, setImports] = useState<DataImport[]>([]);
  const [filePath, setFilePath] = useState('');
  const [activeImport, setActiveImport] = useState<DataImport | null>(null);
  
  // Grid Data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  
  // Anonymization state
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

  const handleDelete = async (id: string) => {
    try {
      await ipcClient.deleteImport(id);
      setImports(imports.filter(i => i.id !== id));
      if (activeImport?.id === id) {
        setActiveImport(null);
      }
    } catch (err) {
      console.error('Failed to delete import:', err);
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

  return (
    <div className="flex h-full w-full bg-obsidian text-bone">
      {/* Sidebar */}
      <div className="w-80 border-r border-subtle bg-surface-base flex flex-col">
        <div className="p-6 border-b border-subtle">
          <h2 className="text-xl font-medium mb-4">Import Data</h2>
          <form onSubmit={handleImport} className="space-y-3">
            <input
              type="text"
              placeholder="Absolute path to CSV file..."
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              className="w-full bg-transparent border border-subtle rounded px-3 py-2 text-sm focus:border-bone focus:outline-none"
            />
            <button type="submit" className="w-full bg-bone text-obsidian rounded py-2 text-sm font-medium hover:opacity-90">
              Import CSV
            </button>
          </form>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">Datasets</h3>
          {imports.map(imp => (
            <div 
              key={imp.id} 
              className={`p-3 rounded border transition-colors cursor-pointer ${
                activeImport?.id === imp.id ? 'border-bone bg-surface-raised' : 'border-subtle bg-obsidian hover:border-text-secondary'
              }`}
              onClick={() => loadGrid(imp)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm truncate pr-2">{imp.source_filename}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(imp.id); }}
                  className="text-text-tertiary hover:text-text-primary text-xs"
                >×</button>
              </div>
              <div className="text-xs text-text-secondary font-mono">{imp.row_count} rows</div>
            </div>
          ))}
          {imports.length === 0 && <div className="text-sm text-text-tertiary">No imports yet.</div>}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-auto p-8 relative flex flex-col">
        {activeImport ? (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-medium tracking-wide mb-1">{activeImport.source_filename}</h1>
              <p className="text-sm text-text-secondary font-mono">{activeImport.internal_table_name}</p>
            </div>

            <div className="bg-surface-base border border-subtle rounded-lg flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-obsidian border-b border-subtle sticky top-0 z-10">
                    {headers.map(col => {
                      if (droppedColumns.has(col)) return null;
                      return (
                        <th key={col} className="px-4 py-3 font-medium text-text-secondary border-r border-subtle last:border-r-0">
                          <div className="flex items-center justify-between space-x-4">
                            <span>{col}</span>
                            <div className="flex space-x-2 text-xs font-normal">
                              <button onClick={() => toggleMask(col)} className={maskedColumns.has(col) ? 'text-bone' : 'text-text-tertiary hover:text-text-primary'} title="Mask Column">
                                Mask
                              </button>
                              <button onClick={() => toggleDrop(col)} className="text-text-tertiary hover:text-text-primary" title="Drop Column">
                                Drop
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
                    <tr key={rIdx} className="border-b border-subtle hover:bg-surface-raised">
                      {headers.map((col, cIdx) => {
                        if (droppedColumns.has(col)) return null;
                        const isMasked = maskedColumns.has(col);
                        const val = row[cIdx];
                        return (
                          <td key={cIdx} className="px-4 py-2 border-r border-subtle last:border-r-0 font-mono">
                            {isMasked ? '****' : val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {rows.length > 100 && (
                    <tr>
                      <td colSpan={headers.length} className="px-4 py-4 text-center text-text-tertiary italic">
                        Showing first 100 rows of {rows.length}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {droppedColumns.size > 0 && (
              <div className="mt-4 pt-4 border-t border-subtle text-sm">
                <span className="text-text-secondary">Dropped Columns: </span>
                {Array.from(droppedColumns).map(col => (
                  <button key={col} onClick={() => toggleDrop(col)} className="ml-2 px-2 py-1 bg-surface-base border border-subtle rounded hover:bg-surface-raised transition-colors">
                    Restore {col}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-text-tertiary">
            Select a dataset to view its grid.
          </div>
        )}
      </div>
    </div>
  );
};
