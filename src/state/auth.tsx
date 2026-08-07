'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AuthContextType {
  isUnlocked: boolean;
  checkAuthState: () => Promise<void>;
  setIsUnlocked: (state: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const checkAuthState = async () => {
    if (window.__TAURI_INTERNALS__) {
      try {
        const state = await invoke<boolean>('get_auth_state');
        setIsUnlocked(state);
      } catch (err) {
        console.error("Failed to fetch auth state:", err);
      }
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  return (
    <AuthContext.Provider value={{ isUnlocked, checkAuthState, setIsUnlocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
