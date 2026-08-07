'use client';
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function Home() {
  const [pingResult, setPingResult] = useState<string>('');

  useEffect(() => {
    // Only run if we are in the Tauri environment
    if (window.__TAURI_INTERNALS__) {
      invoke('ping')
        .then((res) => setPingResult(res as string))
        .catch((err) => console.error('Ping failed:', err));
    } else {
      setPingResult('Not running in Tauri');
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-4">
        <h1 className="text-4xl text-[color:var(--text-primary)]">Secret Vault</h1>
        <p className="text-[color:var(--text-secondary)]">Phase 0 Scaffolding Complete</p>
        <div className="p-4 border border-[color:var(--border-default)] rounded bg-[color:var(--surface-raised)]">
          IPC Ping Result: {pingResult || 'Loading...'}
        </div>
      </div>
    </main>
  );
}
