// supabase-compatible shim for the offline desktop app.
// Talks to the local SQLite database over IPC (Electron preload) and to a
// local auth provider. The rest of the app keeps using the exact same
// supabase-js calls (`supabase.from(...)`, `supabase.auth.*`) with zero edits.
import type { Database } from "../types/supabase";

type Filter = { col: string; op: "eq"; val: any };

interface DesktopBridge {
  db: {
    query: (req: {
      action: "select" | "insert" | "update" | "delete" | "upsert";
      table: string;
      payload?: any;
      filters?: Filter[];
      onConflict?: string[];
      single?: boolean;
    }) => Promise<{ data: any; error: any }>;
    syncStatus: () => Promise<{ configured: boolean; pending: number }>;
    syncNow: () => Promise<any>;
  };
  auth: {
    getSession: () => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signInWithGoogle: () => Promise<any>;
    signUp: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<any>;
    updatePassword: (password: string) => Promise<any>;
    onAuthChanged: (cb: (event: string, session: any) => void) => () => void;
  };
}

function getBridge(): DesktopBridge | null {
  if (typeof window !== "undefined" && (window as any).desktop) {
    return (window as any).desktop as DesktopBridge;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Query builder — awaitable, chainable. Covers the exact patterns used by the
// app:
//   from(T).select("*")
//   from(T).select("*").eq(col, val)
//   from(T).select("*").eq(col, val).single()
//   from(T).insert(row | rows).select()
//   from(T).update(payload).eq(col, val)
//   from(T).delete().eq(col, val)
//   from(T).upsert(payload, { onConflict: "a, b" })
// ---------------------------------------------------------------------------
class QueryBuilder {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" | "upsert";
  private payload: any;
  private filters: Filter[] = [];
  private onConflict: string[] = [];
  private isSingle = false;
  private returnRows = false;
  private execPromise: Promise<{ data: any; error: any }> | null = null;

  constructor(
    table: string,
    action: QueryBuilder["action"],
    payload?: any,
    options?: { returnRows?: boolean }
  ) {
    this.table = table;
    this.action = action;
    this.payload = payload;
    if (options?.returnRows) this.returnRows = true;
  }

  eq(col: string, val: any): this {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  select(_columns: string = "*", _opts?: any): this {
    // `.insert(...).select()` / `.update(...).select()` => return affected rows
    if (this.action !== "select") this.returnRows = true;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  private exec(): Promise<{ data: any; error: any }> {
    if (this.execPromise) return this.execPromise;
    const bridge = getBridge();
    if (!bridge) {
      this.execPromise = Promise.resolve({
        data: null,
        error: { message: "Desktop bridge unavailable (window.desktop)." },
      });
      return this.execPromise;
    }
    this.execPromise = bridge.db.query({
      action: this.action,
      table: this.table,
      payload: this.payload,
      filters: this.filters,
      onConflict: this.onConflict,
      single: this.isSingle,
    });
    return this.execPromise;
  }

  // PromiseLike so `await supabase.from(...)...` works everywhere
  then(
    onfulfilled?: ((value: any) => any) | null,
    onrejected?: ((reason: any) => any) | null
  ) {
    return this.exec().then(onfulfilled, onrejected);
  }

  catch(onrejected?: ((reason: any) => any) | null) {
    return this.exec().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return this.exec().finally(onfinally);
  }
}

// Public Supabase project — zero-config, mirrors src-tauri's BUILTIN_* consts.
// The anon key is public by design (RLS guards the data).
export const SUPABASE_URL = "https://yklkxvvoeovksyslcfjy.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbGt4dnZvZW92a3N5c2xjZmp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjAyMjcsImV4cCI6MjA2OTQ5NjIyN30.j7Whr8rPAtSwNbSyZ2iTTFEQAGsDI51022l4ZfsIlmo";

// Fetch the signed-in user's profiles row straight from Supabase REST (the
// local bridge has no profiles table; the cloud row is the multi-pole source
// of truth). Returns null when the user has no profile row; THROWS on
// transport/HTTP failure so callers can retry later (e.g. on db:synced).
export async function fetchSupabaseProfile(): Promise<{
  role: string | null;
  pole_id: string | null;
} | null> {
  const bridge = getBridge();
  if (!bridge) return null;
  const res = await bridge.auth.getSession();
  const session: any = res?.data?.session;
  const uid = session?.user?.id;
  const token = session?.access_token;
  if (!uid || !token) return null;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(
      uid
    )}&select=role,pole_id`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!r.ok) {
    throw new Error(`profiles fetch failed: ${r.status}`);
  }
  const rows: any[] = await r.json();
  return rows && rows.length > 0 ? rows[0] : null;
}

// ---------------------------------------------------------------------------
// supabase-compatible client
// ---------------------------------------------------------------------------
function fromReal(table: string) {
  const selectBuilder: any = new QueryBuilder(table, "select");
  selectBuilder.insert = (payload: any) => new QueryBuilder(table, "insert", payload);
  selectBuilder.update = (payload: any) => new QueryBuilder(table, "update", payload);
  selectBuilder.delete = () => new QueryBuilder(table, "delete");
  selectBuilder.upsert = (payload: any, options?: { onConflict?: string }) => {
    const builder = new QueryBuilder(table, "upsert", payload);
    if (options?.onConflict) {
      // Re-apply with conflict columns captured
      builder["onConflict"] = options.onConflict
        .split(",")
        .map((c) => c.trim());
    }
    return builder;
  };
  return selectBuilder;
}

const auth = {
  async getSession() {
    const bridge = getBridge();
    if (!bridge) return { data: { session: null }, error: null };
    return bridge.auth.getSession();
  },
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const bridge = getBridge();
    if (!bridge) {
      callback("INITIAL_SESSION", null);
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    bridge.auth.getSession().then((res) => {
      callback("INITIAL_SESSION", res?.data?.session ?? null);
    });
    const unsubscribe = bridge.auth.onAuthChanged((event, session) => {
      callback(event, session);
    });
    return { data: { subscription: { unsubscribe } } };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const bridge = getBridge();
    if (!bridge) return { error: { message: "Desktop bridge unavailable." } };
    const res = await bridge.auth.signIn(email, password);
    return res.error ? res : { data: res.data, error: null };
  },
  async signUp({
    email,
    password,
  }: {
    email: string;
    password: string;
    options?: any;
  }) {
    const bridge = getBridge();
    if (!bridge) return { error: { message: "Desktop bridge unavailable." } };
    const res = await bridge.auth.signUp(email, password);
    return res.error ? res : { data: res.data, error: null };
  },
  async signOut() {
    const bridge = getBridge();
    if (!bridge) return { error: null };
    return bridge.auth.signOut();
  },
  async updateUser({ password }: { password: string }) {
    const bridge = getBridge();
    if (!bridge) return { error: { message: "Desktop bridge unavailable." } };
    return bridge.auth.updatePassword(password);
  },
  // OAuth via Electron popup: returns immediately; the session arrives later
  // through the onAuthChanged event (SIGNED_IN).
  async signInWithOAuth(_opts: any) {
    const bridge = getBridge();
    if (!bridge) {
      return { error: { message: "Disponible uniquement dans l'application desktop." } };
    }
    return bridge.auth.signInWithGoogle();
  },
  async resetPasswordForEmail(_email: string, _opts?: any) {
    return { data: null, error: null };
  },
};

export const supabase = { from: fromReal, auth } as any;

// Keep the original Database type available for type-only imports
export type { Database };
