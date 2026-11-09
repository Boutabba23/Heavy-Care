"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase, fetchSupabaseProfile } from "../utils/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  devMode: boolean;
  toggleDevMode: () => void;
  profile: { role: string | null; pole_id: string | null } | null;
  profileLoaded: boolean;
  poleId: string | null;
  role: string | null;
  isSuperAdmin: boolean;
  isPoleAdmin: boolean;
  isUser: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
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
  const [devMode, setDevMode] = useState(process.env.NODE_ENV === 'development');
  // Multi-pole: the cloud profiles row decides the session's pole + role.
  // Local-only accounts have no cloud profile — poleId stays null, which is
  // fine because their data never leaves this machine.
  const [profile, setProfile] = useState<{ role: string | null; pole_id: string | null } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const toggleDevMode = () => {
    setDevMode(prev => !prev);
  };

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    // Local accounts (offline, no cloud session) have no cloud profile —
    // poleId stays null by design and they are never gated.
    if (!session?.user || !(session as any).access_token) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    try {
      const row = await fetchSupabaseProfile();
      setProfile(row);
      setProfileLoaded(true);
    } catch {
      // Transient failure — leave profileLoaded false; the db:synced
      // listener retries once the sync loop refreshes the token.
    }
  };

  useEffect(() => {
    // Get initial session + cloud profile
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      await fetchProfile();
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile();
      } else {
        setProfile(null);
        setProfileLoaded(true);
      }
      setLoading(false);
    });

    // Refresh the pole after each successful sync (pole can be reassigned
    // from the admin app while the desktop app is running)
    const onSynced = () => { void (async () => { await fetchProfile(); })(); };
    window.addEventListener("db:synced", onSynced as any);

    return () => subscription.unsubscribe();
  }, []);

  const role = profile?.role ?? null;
  const poleId = profile?.pole_id ?? null;
  const isSuperAdmin = role === "super_admin";
  const isPoleAdmin = role === "pole_admin";
  const isUser = role === "user";

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    setProfileLoaded(true);
    return { error };
  };

  const signInWithGoogle = async () => {
   
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      //options: {redirectTo},
      options: {
      redirectTo: `${window.location.origin}/`,
      }
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    devMode,
    toggleDevMode,
    profile,
    profileLoaded,
    poleId,
    role,
    isSuperAdmin,
    isPoleAdmin,
    isUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
