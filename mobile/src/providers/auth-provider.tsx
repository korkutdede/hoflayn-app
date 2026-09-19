import type { MeResponse } from '@hoflayn/contracts';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState, Platform } from 'react-native';
import { apiRequest } from '@/src/lib/api';
import { DEMO_ME } from '@/src/lib/demo';
import { supabase } from '@/src/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  me: MeResponse | null;
  isDemo: boolean;
  loading: boolean;
  error: string | null;
  enterDemo: () => void;
  refreshMe: () => Promise<MeResponse | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const demoRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    if (demoRef.current) {
      setMe(DEMO_ME);
      return DEMO_ME;
    }
    try {
      const profile = await apiRequest<MeResponse>('/api/v1/me');
      setMe(profile);
      setError(null);
      return profile;
    } catch (reason) {
      setMe(null);
      setError(reason instanceof Error ? reason.message : 'Hesap yüklenemedi.');
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await refreshMe();
      if (active) setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        if (!demoRef.current) setMe(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      void refreshMe().finally(() => setLoading(false));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [refreshMe]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      me,
      isDemo,
      loading,
      error,
      enterDemo: () => {
        demoRef.current = true;
        setIsDemo(true);
        setMe(DEMO_ME);
        setError(null);
      },
      refreshMe,
      signOut: async () => {
        if (!demoRef.current) await supabase.auth.signOut();
        demoRef.current = false;
        setIsDemo(false);
        setMe(null);
      },
    }),
    [error, isDemo, loading, me, refreshMe, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  return value;
}
