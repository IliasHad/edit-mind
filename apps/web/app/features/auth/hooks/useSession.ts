import { createContext, useContext } from 'react';

export interface Session {
  isAuthenticated: boolean;
  user: { email?: string} | null;
}

interface SessionContextType {
  session: Session;
  setSession: (session: Session) => void;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
