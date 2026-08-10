import React, { useState, useEffect } from 'react';
import { ipcClient, VaultCredential } from '../../lib/ipc-client';
import { resolveIcon } from '../../lib/icon-resolver';
import { Plus, Search, Copy, Check, ChevronDown } from 'lucide-react';
import { CredentialModal } from './CredentialModal';

export function VaultList() {
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<VaultCredential | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCredentials = async () => {
    try {
      const creds = await ipcClient.getCredentials();
      setCredentials(creds);
    } catch (e) {
      console.error("Failed to load credentials:", e);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleCopy = async (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    try {
      await ipcClient.copyToClipboard(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const filtered = credentials.filter(c => 
    c.account_name.toLowerCase().includes(search.toLowerCase()) || 
    c.username_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-full pt-12 px-12 relative">
        {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-3">Vault Items</h3>
          <h1 className="text-4xl font-bold text-text-primary tracking-tight">Credentials</h1>
        </div>
        <button
          onClick={() => { setEditingCred(undefined); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-bone text-obsidian px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          <span>Add credential</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search credentials"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border border-border-subtle rounded-xl py-3 pl-11 pr-4 text-text-primary focus:outline-none focus:border-border-default transition-colors text-sm"
          />
        </div>
        <button className="flex items-center justify-between gap-4 px-5 py-3 bg-transparent border border-border-subtle rounded-xl hover:border-border-default transition-colors text-sm font-medium min-w-[120px]">
          <span>All vaults</span>
          <ChevronDown size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Table */}
      <div className="w-full pb-10 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[2fr_2fr_1fr_1fr] px-2 pb-4 border-b border-border-subtle">
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Name</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Username</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase">Last Used</div>
            <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase text-right">Actions</div>
          </div>
          
          <div className="flex flex-col">
          {filtered.length === 0 ? (
            <div className="text-center text-text-secondary mt-12">
              <p>No credentials found.</p>
            </div>
          ) : (
            filtered.map(cred => (
              <div 
                key={cred.id}
                onClick={() => { setEditingCred(cred); setIsModalOpen(true); }}
                className="grid grid-cols-[2fr_2fr_1fr_1fr] items-center px-2 py-5 border-b border-border-subtle hover:bg-surface-raised transition-colors cursor-pointer group"
              >
                <div className="font-semibold text-sm text-text-primary">{cred.account_name}</div>
                <div className="text-sm font-mono text-text-secondary truncate pr-4">{cred.username_email}</div>
                {/* Fallback to Today for UI demonstration since last_used doesn't exist */}
                <div className="text-sm text-text-secondary font-mono">Today</div>
                <div className="flex justify-end">
                  <button
                    onClick={(e) => handleCopy(e, cred.encrypted_password, cred.id + '_pass')}
                    className="p-1.5 text-text-secondary hover:text-bone transition-colors rounded"
                    title="Copy Password"
                  >
                    {copiedId === cred.id + '_pass' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>

      <CredentialModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSaved={loadCredentials}
        existingCred={editingCred}
      />
      </div>
    </div>
  );
}
