'use client';

import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthProvider, useAuth } from '../state/auth';
import { SetupScreen } from '../components/auth/SetupScreen';
import { UnlockScreen } from '../components/auth/UnlockScreen';
import { VaultList } from '../components/vault/VaultList';
import { NotesModule } from '../components/notes/NotesModule';
import { TasksModule } from '../components/tasks/TasksModule';
import { IncomeModule } from '../components/income/IncomeModule';
import { DataWorkspaceModule } from '../components/data-workspace/DataWorkspaceModule';
import { SettingsModule } from '../components/settings/SettingsModule';

type ViewMode = 'vault' | 'notes' | 'tasks' | 'income' | 'data' | 'settings';

function AppContent() {
  const { isUnlocked } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('vault');

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
    <div className="flex h-screen w-full overflow-hidden bg-surface-base text-bone font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border-subtle bg-[color:var(--color-obsidian)]">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-bone mb-8">Secret</h1>
          <nav className="space-y-2">
            {[
              { id: 'vault', label: 'Vault' },
              { id: 'notes', label: 'Notes' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'income', label: 'Income' },
              { id: 'data', label: 'Data Workspace' },
              { id: 'settings', label: 'Settings' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewMode)}
                className={`w-full text-left px-4 py-2 rounded transition-colors text-sm font-medium ${
                  currentView === item.id 
                    ? 'bg-surface-raised text-bone' 
                    : 'text-text-secondary hover:text-bone hover:bg-surface-raised/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6">
          <button 
            className="w-full px-4 py-2 bg-red-900/20 border border-red-900 rounded text-red-400 text-sm font-medium hover:bg-red-900/40 transition-colors"
            onClick={async () => {
              await invoke('lock');
              window.location.reload();
            }}
          >
            Lock Vault
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-hidden relative">
        {currentView === 'vault' && <VaultList />}
        {currentView === 'notes' && <NotesModule />}
        {currentView === 'tasks' && <TasksModule />}
        {currentView === 'income' && <IncomeModule />}
        {currentView === 'data' && <DataWorkspaceModule />}
        {currentView === 'settings' && <SettingsModule />}
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
