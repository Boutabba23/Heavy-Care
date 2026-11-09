'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/poles', label: 'Pôles' },
  { href: '/users', label: 'Utilisateurs' },
  { href: '/statistics', label: 'Statistiques' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, profile, isSuperAdmin } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        Chargement de la console d&apos;administration...
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  // The panel is restricted to super admins by design: pole admins and users
  // manage everything from the main app, one record belongs to one pole.
  if (!isSuperAdmin) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Accès refusé</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Cette console est réservée aux Super Admins. Votre rôle
            (&laquo;&nbsp;{profile?.role ?? 'inconnu'}&nbsp;&raquo;) ne permet pas
            d&apos;y accéder.
          </p>
          <button className="btn secondary" onClick={() => signOut()}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot">HC</span> Heavy-Care Admin
        </div>
        {NAV.map((nav) => (
          <Link
            key={nav.href}
            href={nav.href}
            className={pathname.startsWith(nav.href) ? 'nav-item active' : 'nav-item'}
          >
            {nav.label}
          </Link>
        ))}
        <div className="footer">
          <div style={{ wordBreak: 'break-all', marginBottom: 8 }}>{user.email}</div>
          <button className="btn secondary small" onClick={() => signOut()}>
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo-row">
          <span className="dot" style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center' }}>HC</span>
          Heavy-Care — Console Admin
        </div>
        <label className="field">
          Email
          <input
            className="input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </label>
        <label className="field">
          Mot de passe
          <input
            className="input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {err && <div className="error" style={{ padding: 0, textAlign: 'left' }}>{err}</div>}
        <button className="btn" disabled={busy}>
          {busy ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
