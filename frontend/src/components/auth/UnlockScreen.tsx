'use client';

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuth } from '../../state/auth';

export function UnlockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkAuthState } = useAuth();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError('');
    
    try {
      await invoke('unlock', { password });
      await checkAuthState();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[color:var(--color-obsidian)]">
      <div className="w-full max-w-md p-8 border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] rounded shadow-xl">
        <h2 className="text-2xl font-semibold text-[color:var(--color-text-primary)] mb-6">Unlock Vault</h2>
        
        {error && (
          <div className="mb-6 p-4 border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-base)] text-[color:var(--color-text-primary)] font-bold rounded animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleUnlock} className="flex flex-col gap-4">
          <input
            type="password"
            autoComplete="off"
            spellCheck="false"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Master Password"
            className="w-full px-4 py-3 bg-[color:var(--color-surface-base)] border border-[color:var(--color-border-subtle)] rounded text-[color:var(--color-text-primary)] focus:outline-none focus:border-[color:var(--color-text-primary)] transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 bg-[color:var(--color-accent-solid)] text-[color:var(--color-accent-on-accent)] font-semibold rounded hover:opacity-90 transition-opacity"
            style={{ backgroundImage: 'linear-gradient(135deg, rgba(244, 237, 228, 1) 0%, rgba(244, 237, 228, 0.8) 100%)' }}
          >
            {loading ? 'Decrypting...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
