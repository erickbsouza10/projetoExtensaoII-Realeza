import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  api,
  ApiError,
  setApiToken,
  setUnauthorizedHandler,
  type AuthSession,
  type LoginInput,
  type RegisterInput,
  type UserProfile,
} from '../services/api';
import { AuthContext } from './auth-context';
const SESSION_KEY = 'realeza.accessToken';
function savedToken() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(SESSION_KEY, token);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* Session still works in memory when storage is unavailable. */
  }
}
export default function AuthProvider({ children }: { children: ReactNode }) {
  const epoch = useRef(0);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const logout = useCallback(() => {
    epoch.current += 1;
    setApiToken(null);
    storeToken(null);
    setUser(null);
    setStatus('ready');
  }, []);
  useEffect(() => {
    let active = true;
    const generation = ++epoch.current;
    setUnauthorizedHandler(logout);
    const token = savedToken();
    setApiToken(token);
    if (!token) {
      Promise.resolve().then(() => {
        if (active && generation === epoch.current) setStatus('ready');
      });
    } else {
      api<UserProfile>('/auth/me', { authenticated: true })
        .then((profile) => {
          if (active && generation === epoch.current) {
            setUser(profile);
            setStatus('ready');
          }
        })
        .catch((error) => {
          if (!active || generation !== epoch.current) return;
          if (error instanceof ApiError && error.status === 401) logout();
          else setStatus('error');
        });
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === SESSION_KEY || event.key === null) {
        if (!savedToken()) logout();
        else {
          setStatus('loading');
          setAttempt((value) => value + 1);
        }
      }
    };
    window.addEventListener('storage', storageChanged);
    return () => {
      active = false;
      setUnauthorizedHandler(null);
      window.removeEventListener('storage', storageChanged);
    };
  }, [logout, attempt]);
  async function authenticate(path: string, input: LoginInput | RegisterInput) {
    const session = await api<AuthSession>(path, { method: 'POST', body: input });
    setApiToken(session.accessToken);
    try {
      const profile = await api<UserProfile>('/auth/me', { authenticated: true });
      storeToken(session.accessToken);
      setUser(profile);
      setStatus('ready');
    } catch (error) {
      logout();
      throw error;
    }
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        logout,
        login: (input) => authenticate('/auth/login', input),
        register: (input) => authenticate('/auth/register', input),
        retry: () => {
          setStatus('loading');
          setAttempt((value) => value + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
