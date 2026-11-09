"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import type { Profile, Pole } from "../types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  devMode: boolean;
  toggleDevMode: () => void;
  profile: Profile | null;
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
      return;
    }

    setProfile(data as Profile);
    setPole((data as any).pole ?? null);
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
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
    devMode,
    toggleDevMode,
    profile,
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
