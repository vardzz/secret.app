'use client';

import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthProvider, useAuth } from '../state/auth';
import { SetupScreen } from '../components/auth/SetupScreen';
import { UnlockScreen } from '../components/auth/UnlockScreen';

function AppContent() {
  const { isUnlocked } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    if (window.__TAURI_INTERNALS__) {
      invoke<boolean>('needs_setup')
        .then((res) => setNeedsSetup(res))
        .catch((err) => console.error(err));
    } else {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--color-obsidian)] text-[color:var(--color-text-primary)]">
      <h1 className="text-4xl mb-4 font-bold">Secret Vault</h1>
      <p className="text-[color:var(--color-text-secondary)]">Vault is Unlocked!</p>
      <button 
        className="mt-6 px-4 py-2 bg-[color:var(--color-surface-raised)] border border-[color:var(--color-border-subtle)] rounded hover:bg-[color:var(--color-surface-raised-hover)]"
        onClick={async () => {
          await invoke('lock');
          window.location.reload();
        }}
      >
        Lock Vault
      </button>
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
