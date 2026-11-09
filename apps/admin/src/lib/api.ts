'use client';

import { supabase } from './supabase';

/**
 * Thin client for the `admin-users` Edge Function. ALL privileged operations
 * (listing emails, creating users, changing roles/poles, deleting accounts)
 * run server-side with the service-role key — it never reaches the browser:
 * the browser sends only the caller's personal session JWT, and the function
 * verifies the caller is a super_admin before doing anything.
 */
export async function adminRpc<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Non connecté.');

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ action, ...payload }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Erreur Edge Function (${res.status})`);
  }
  return body as T;
}
