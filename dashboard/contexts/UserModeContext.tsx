import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type UserMode = 'beginner' | 'pro';

interface UserModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  isBeginnerMode: boolean;
  isProMode: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

export function UserModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<UserMode>('beginner');

  useEffect(() => {
    // Load user mode from localStorage or user settings
    const savedMode = localStorage.getItem(`userMode_${user?.id}`) as UserMode;
    if (savedMode && (savedMode === 'beginner' || savedMode === 'pro')) {
      setModeState(savedMode);
    }
  }, [user?.id]);

  const setMode = (newMode: UserMode) => {
    setModeState(newMode);
    if (user?.id) {
      localStorage.setItem(`userMode_${user.id}`, newMode);
    }
  };

  const value: UserModeContextType = {
    mode,
    setMode,
    isBeginnerMode: mode === 'beginner',
    isProMode: mode === 'pro'
  };

  return (
    <UserModeContext.Provider value={value}>
      {children}
    </UserModeContext.Provider>
  );
}

export function useUserMode() {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
}