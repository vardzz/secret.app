'use client';

import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthProvider, useAuth } from '../state/auth';
import { SetupScreen } from '../components/auth/SetupScreen';
import { UnlockScreen } from '../components/auth/UnlockScreen';
import { OverviewModule } from '../components/overview/OverviewModule';
import { VaultList } from '../components/vault/VaultList';
import { NotesModule } from '../components/notes/NotesModule';
import { TasksModule } from '../components/tasks/TasksModule';
import { IncomeModule } from '../components/income/IncomeModule';
import { DataWorkspaceModule } from '../components/data-workspace/DataWorkspaceModule';
import { SettingsModule } from '../components/settings/SettingsModule';
import { Key, LayoutGrid, FileEdit, CheckSquare, Mail, Database, Activity, SlidersHorizontal, Lock } from 'lucide-react';

type ViewMode = 'overview' | 'credentials' | 'notes' | 'tasks' | 'income' | 'data' | 'activity' | 'settings';

function AppContent() {
  const { isUnlocked } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('overview');

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
      <aside className="w-64 flex flex-col border-r border-border-subtle bg-[color:var(--color-obsidian)] shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 text-bone">
            <div className="bg-bone text-obsidian p-1 rounded-md">
              <Key size={18} className="rotate-45" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">secret</h1>
          </div>
          
          <div className="text-[11px] font-semibold text-text-tertiary tracking-widest uppercase mb-4 px-2">
            PRIVATE WORKSPACE
          </div>
          
          <nav className="space-y-1.5">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutGrid },
              { id: 'credentials', label: 'Credentials', icon: Key },
              { id: 'notes', label: 'Secure notes', icon: FileEdit },
              { id: 'tasks', label: 'Tasks', icon: CheckSquare },
              { id: 'income', label: 'Income', icon: Mail },
              { id: 'data', label: 'Data workspace', icon: Database },
              { id: 'activity', label: 'Activity', icon: Activity },
              { id: 'settings', label: 'Settings', icon: SlidersHorizontal }
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as ViewMode)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    isActive 
                      ? 'bg-bone text-obsidian' 
                      : 'text-text-secondary hover:text-bone hover:bg-surface-raised/50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="mt-auto p-6">
          <button 
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border-subtle rounded-xl text-text-secondary text-sm font-medium hover:text-bone hover:border-border-default hover:bg-surface-raised/50 transition-all"
            onClick={async () => {
              await invoke('lock');
              window.location.reload();
            }}
          >
            <Lock size={16} />
            <span>Lock vault</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-hidden relative">
        {currentView === 'overview' && <OverviewModule />}
        {currentView === 'credentials' && <VaultList />}
        {currentView === 'notes' && <NotesModule />}
        {currentView === 'tasks' && <TasksModule />}
        {currentView === 'income' && <IncomeModule />}
        {currentView === 'data' && <DataWorkspaceModule />}
        {currentView === 'activity' && <div className="p-8 text-text-secondary">Activity Module</div>}
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
