"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";

type SyncStatus = {
  configured: boolean;
  pending: number;
  lastSync: string | null;
};

function getBridge(): any {
  return typeof window !== "undefined" ? (window as any).desktop : null;
}

const SyncIndicator: React.FC = () => {
  const bridge = getBridge();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<SyncStatus>({
    configured: false,
    pending: 0,
    lastSync: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = React.useCallback(async () => {
    const b = getBridge();
    if (!b?.db) return;
    try {
      const s = await b.db.syncStatus();
      setStatus(s);
    } catch {
      /* bridge not ready yet */
    }
  }, []);

  useEffect(() => {
    if (!bridge?.db) return;
    refresh();
    const interval = setInterval(refresh, 15000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [bridge, refresh]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSyncNow = async () => {
    const b = getBridge();
    if (!b?.db || isSyncing) return;
    setIsSyncing(true);
    setSyncMessage(null);
    setSyncError(false);
    try {
      const result = await b.db.syncNow();
      if (result?.ok) {
        setSyncMessage("Synchronisation réussie");
      } else {
        setSyncError(true);
        if (result?.status === "not-configured") {
          setSyncMessage("Synchronisation non configurée");
        } else if (result?.status === "unauthenticated") {
          setSyncError(false);
          setSyncMessage(
            "Connectez-vous (Google ou email/mot de passe) pour synchroniser."
          );
        } else {
          setSyncMessage(
            "Échec de la synchronisation (voir le terminal)"
          );
        }
      }
    } catch {
      setSyncError(true);
      setSyncMessage("Échec de la synchronisation");
    } finally {
      setIsSyncing(false);
      refresh();
    }
  };

  const dotColor = !status.configured
    ? "bg-muted-foreground"
    : status.pending > 0
      ? "bg-warning"
      : "bg-green-500";

  const label = !status.configured
    ? "Hors ligne (local)"
    : status.pending > 0
      ? `${status.pending} modif.${status.pending > 1 ? "s" : ""} en attente`
      : "Synchronisé";

  return (
    <div className='relative' ref={panelRef}>
      <button
        onClick={() => setIsOpen((p) => !p)}
        className='hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-foreground bg-card text-xs font-bold text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0 active:translate-y-0 active:shadow-none'
        title='État de la synchronisation'>
        <span
          className={`h-2 w-2 rounded-full ${dotColor} ${
            status.pending > 0 ? "animate-pulse" : ""
          }`}
        />
        <span className='hidden lg:inline'>{label}</span>
      </button>

      {isOpen && (
        <div className='absolute right-0 mt-2 w-72 rounded-2xl border-2 border-foreground bg-card shadow-[5px_6px_0_0_hsl(var(--foreground))] overflow-hidden z-50 animate-fadeIn'>
          <div className='px-4 py-3 border-b-2 border-foreground/10 bg-muted/50'>
            <p className='text-[10px] font-black uppercase tracking-wider text-muted-foreground'>
              Synchronisation
            </p>
            <div className='flex items-center gap-2 mt-1.5'>
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              <p className='text-xs font-bold text-foreground'>
                {label}
              </p>
            </div>
          </div>

          <div className='px-4 py-3 text-xs text-muted-foreground space-y-1.5'>
            <p>
              <span className='font-bold text-foreground'>Stockage local:</span>{" "}
              SQLite (fonctionne hors ligne)
            </p>
            <p>
              <span className='font-bold text-foreground'>Modifications en attente:</span>{" "}
              {status.pending}
            </p>
            {status.lastSync && (
              <p>
                <span className='font-bold text-foreground'>Dernière sync:</span>{" "}
                {new Date(status.lastSync).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {!status.configured && (
              <p className='pt-1 leading-relaxed'>
                Pour activer la synchronisation Supabase, créez{" "}
                <code className='rounded-md border border-foreground/20 bg-muted px-1'>
                  supabase-config.json
                </code>{" "}
                dans le dossier desktop (voir{" "}
                <code className='rounded-md border border-foreground/20 bg-muted px-1'>
                  supabase-config.example.json
                </code>
                ).
              </p>
            )}
            {syncMessage && (
              <p
                className={`pt-1 font-bold ${
                  syncError ? "text-destructive" : "text-green-600"
                }`}>
                {syncMessage}
              </p>
            )}
          </div>

          <div className='p-3 border-t-2 border-foreground/10'>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className='w-full flex items-center justify-center py-2 text-xs font-black rounded-xl border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:pointer-events-none'>
              {isSyncing ? (
                <>
                  <svg
                    className='animate-spin h-3.5 w-3.5 mr-2'
                    viewBox='0 0 24 24'
                    fill='none'>
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z'
                    />
                  </svg>
                  Synchronisation...
                </>
              ) : (
                "Synchroniser maintenant"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncIndicator;
