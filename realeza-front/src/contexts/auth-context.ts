import { createContext, useContext } from 'react';
import type { LoginInput, RegisterInput, UserProfile } from '../services/api';
export interface AuthState {
  user: UserProfile | null;
  status: 'loading' | 'ready' | 'error';
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  retry: () => void;
}
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth exige AuthProvider.');
  return auth;
}
