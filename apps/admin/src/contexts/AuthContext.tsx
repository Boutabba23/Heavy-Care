'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, Pole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  profile: Profile | null;
  pole: Pole | null;
  role: Profile['role'] | null;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  // The role lives in the cloud `profiles` row (RLS source of truth), NEVER in
  // app_metadata — this panel works on the exact same grant as the main app.
  const [role, setRole] = useState<Profile['role'] | null>(null);
  const [pole, setPole] = useState<Pole | null>(null);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setPole(null);
  };

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, pole_id, pole:poles(id, code, name, created_at, updated_at, archived_at)')
      .eq('id', uid)
      .single();

    if (error || !data) {
      setProfile(null);
      setRole(null);
      setPole(null);
      return;
    }

    const row = data as unknown as Profile & { pole: Pole | null };
    setProfile({ id: row.id, role: row.role, pole_id: row.pole_id });
    setRole(row.role);
    setPole(row.pole ?? null);
  };

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
          setPole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isSuperAdmin = role === 'super_admin';

  const value = {
    user,
    session,
    loading,
    signOut,
    profile,
    pole,
    role,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
