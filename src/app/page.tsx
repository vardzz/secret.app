'use client';

import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthProvider, useAuth } from '../state/auth';
import { SetupScreen } from '../components/auth/SetupScreen';
import { UnlockScreen } from '../components/auth/UnlockScreen';
import { VaultList } from '../components/vault/VaultList';

function AppContent() {
  const { isUnlocked } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    if ((window as any).__TAURI_INTERNALS__) {
      invoke<boolean>('needs_setup')
        .then((res) => setNeedsSetup(res))
        .catch((err) => console.error(err));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNeedsSetup(true); // default to true if not in Tauri
    }
  }, []);

  if (needsSetup === null) {
    return <div className="min-h-screen bg-[color:var(--color-obsidian)]" />;
  }

  if (needsSetup && !isUnlocked) {
    return <SetupScreen />;
  }

  if (!isUnlocked) {
    return <UnlockScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface-base">
        <h1 className="text-xl font-bold tracking-tight">Secret</h1>
        <button 
          className="px-4 py-2 bg-surface-raised border border-border-subtle rounded-lg text-sm font-medium hover:bg-surface-raised-hover transition-colors"
          onClick={async () => {
            await invoke('lock');
            window.location.reload();
          }}
        >
          Lock Vault
        </button>
      </header>
      <main className="flex-1">
        <VaultList />
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
