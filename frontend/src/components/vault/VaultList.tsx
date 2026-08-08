import React, { useState, useEffect } from 'react';
import { ipcClient, VaultCredential } from '../../lib/ipc-client';
import { resolveIcon } from '../../lib/icon-resolver';
import { Plus, Search, Star, ExternalLink, Copy, Check, Key } from 'lucide-react';
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
    <div className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col pt-8">
      <div className="flex justify-between items-center mb-8 px-4">
        <h1 className="text-3xl font-bold">All Items</h1>
        <button
          onClick={() => { setEditingCred(undefined); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-bone text-obsidian px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          <span>New Item</span>
        </button>
      </div>

      <div className="relative mb-6 px-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-surface-raised border border-border-subtle rounded-xl py-3 pl-12 pr-4 text-text-primary focus:outline-none focus:border-border-default transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-text-secondary mt-20">
            <p>No items found.</p>
          </div>
        ) : (
          filtered.map(cred => {
            const Icon = resolveIcon(cred.provider_url);
            
            return (
              <div 
                key={cred.id}
                onClick={() => { setEditingCred(cred); setIsModalOpen(true); }}
                className="group flex items-center justify-between p-4 bg-surface-raised border border-border-subtle rounded-xl hover:bg-surface-raised-hover hover:border-border-default transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-surface-base border border-border-subtle flex items-center justify-center shrink-0">
                    <Icon size={20} className="text-text-secondary" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary truncate">{cred.account_name}</span>
                      {cred.is_favorite && <Star size={14} className="text-accent-solid fill-accent-solid" />}
                    </div>
                    <span className="text-sm text-text-secondary truncate">{cred.username_email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleCopy(e, cred.username_email, cred.id + '_user')}
                    className="p-2 hover:bg-surface-base rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    title="Copy Username"
                  >
                    {copiedId === cred.id + '_user' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={(e) => handleCopy(e, cred.encrypted_password, cred.id + '_pass')}
                    className="p-2 hover:bg-surface-base rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    title="Copy Password"
                  >
                    {copiedId === cred.id + '_pass' ? <Check size={16} /> : <Key size={16} />}
                  </button>
                  {cred.provider_url && (
                    <a
                      href={cred.provider_url.startsWith('http') ? cred.provider_url : `https://${cred.provider_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-surface-base rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                      title="Open URL"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <CredentialModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSaved={loadCredentials}
        existingCred={editingCred}
      />
    </div>
  );
}
