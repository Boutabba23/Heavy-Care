"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase, fetchSupabaseProfileFull } from "../utils/supabase";
import type { Profile, Pole } from "../types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  devMode: boolean;
  toggleDevMode: () => void;
  profile: Profile | null;
  profileLoaded: boolean;
  pole: Pole | null;
  role: string | null;
  poleId: string | null;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pole, setPole] = useState<Pole | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const toggleDevMode = () => {
    setDevMode(prev => !prev);
  };

  const role = profile?.role ?? null;
  const poleId = profile?.pole_id ?? null;
  const isSuperAdmin = role === "super_admin";
  const isPoleAdmin = role === "pole_admin";
  const isUser = role === "user";

  const fetchProfile = async (uid: string | null) => {
    if (!uid) {
      setProfile(null);
      setPole(null);
      setProfileLoaded(true);
      return;
    }
    // Desktop: no local profiles/poles tables — fetch via Supabase REST shim.
    const isDesktop = typeof window !== "undefined" && (window as any).desktop;
    if (isDesktop) {
      try {
        const row = await fetchSupabaseProfileFull();
        setProfile((row as Profile) ?? null);
        setPole((row as any)?.pole ?? null);
      } catch {
        // Transient failure — keep previous state; the db:synced listener
        // retries once the sync loop refreshes the token.
      }
      setProfileLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*, pole:poles(id, code, name, created_at, updated_at, archived_at, password_hash)")
      .eq("id", uid)
      .single();

    if (error || !data) {
      setProfile(null);
      setPole(null);
      setProfileLoaded(true);
      return;
    }

    setProfile(data as Profile);
    setPole((data as any).pole ?? null);
    setProfileLoaded(true);
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
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
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setPole(null);
        setProfileLoaded(true);
      }
      setLoading(false);
    });

    // Refresh the pole after each successful sync (pole can be reassigned
    // from the admin app while the desktop app is running) and retry any
    // transient profile fetch failure.
    const onSynced = () => {
      void (async () => {
        const uid = session?.user?.id ?? null;
        if (uid) await fetchProfile(uid);
      })();
    };
    window.addEventListener("db:synced", onSynced as any);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("db:synced", onSynced as any);
    };
  }, []);

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
    return { error };
  };

  const signInWithGoogle = async () => {
    // The desktop supabase shim routes this to the Tauri command
    // `auth_sign_in_google` (PKCE in the system browser + loopback callback);
    // on the web it is a normal browser redirect. The session arrives later
    // through the auth:changed / onAuthStateChange events either way.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
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
    devMode,
    toggleDevMode,
    profile,
    profileLoaded,
    pole,
    role,
    poleId,
    isSuperAdmin,
    isPoleAdmin,
    isUser,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
