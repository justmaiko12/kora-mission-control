"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface EmailAccount {
  id: string;
  email: string;
  name: string;
  provider: "gmail" | "outlook" | "other";
  unreadCount: number;
}

export interface EmailThread {
  id: string;
  subject: string;
  from: string;
  date: string;
  labels: string[];
  messageCount: number;
  read: boolean;
  snippet: string;
}

interface EmailsState {
  accounts: EmailAccount[];
  loading: boolean;
  error: string | null;
  initialLoadComplete: boolean;
}

// Global cache - persists across tab switches
const emailCache: Record<string, EmailThread[]> = {};
const cacheTimestamps: Record<string, number> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useEmails() {
  const [state, setState] = useState<EmailsState>({
    accounts: [],
    loading: true,
    error: null,
    initialLoadComplete: false,
  });
  const [activeAccount, setActiveAccount] = useState<string>("");
  const [emails, setEmails] = useState<EmailThread[]>([]);
  const fetchingRef = useRef<Set<string>>(new Set());

  // Get cached emails for current account
  const getCachedEmails = useCallback((account: string): EmailThread[] | null => {
    const cached = emailCache[account];
    const timestamp = cacheTimestamps[account];
    if (cached && timestamp && Date.now() - timestamp < CACHE_TTL) {
      return cached;
    }
    return null;
  }, []);

  // Fetch emails for a single account
  const fetchEmailsForAccount = useCallback(async (account: string): Promise<EmailThread[]> => {
    // Prevent duplicate fetches
    if (fetchingRef.current.has(account)) {
      return getCachedEmails(account) || [];
    }

    fetchingRef.current.add(account);
    try {
      const res = await fetch(
        `/api/emails?account=${encodeURIComponent(account)}&query=newer_than:14d&max=50`
      );
      if (!res.ok) throw new Error("Failed to fetch emails");
      const data = await res.json();

      const emailList: EmailThread[] = (data.emails || []).map(
        (email: EmailThread) => ({
          ...email,
          read: !email.labels?.includes("UNREAD"),
        })
      );

      // Cache it
      emailCache[account] = emailList;
      cacheTimestamps[account] = Date.now();

      return emailList;
    } finally {
      fetchingRef.current.delete(account);
    }
  }, [getCachedEmails]);

  // Fetch accounts and preload ALL emails in parallel
  useEffect(() => {
    let cancelled = false;

    async function loadEverything() {
      try {
        // 1. Get accounts
        const res = await fetch("/api/emails");
        if (!res.ok) throw new Error("Failed to fetch accounts");
        const data = await res.json();
        
        const accounts: EmailAccount[] = (data.accounts || []).map(
          (acc: { email: string; name: string }) => ({
            id: acc.email,
            email: acc.email,
            name: acc.email, // Use full email as name
            provider: "gmail" as const,
            unreadCount: 0,
          })
        );

        if (cancelled) return;

        // Set accounts immediately so tabs show up
        setState((s) => ({ ...s, accounts }));

        if (accounts.length === 0) {
          setState((s) => ({ ...s, loading: false, initialLoadComplete: true }));
          return;
        }

        // 2. Preload ALL accounts in parallel
        const emailPromises = accounts.map(async (acc) => {
          const emails = await fetchEmailsForAccount(acc.email);
          return { email: acc.email, emails };
        });

        const results = await Promise.all(emailPromises);

        if (cancelled) return;

        // Update unread counts for all accounts
        const updatedAccounts = accounts.map((acc) => {
          const result = results.find((r) => r.email === acc.email);
          const unreadCount = result?.emails.filter((e) => !e.read).length || 0;
          return { ...acc, unreadCount };
        });

        setState((s) => ({
          ...s,
          accounts: updatedAccounts,
          loading: false,
          initialLoadComplete: true,
        }));

        // Set initial active account and its emails
        if (!activeAccount && accounts.length > 0) {
          const firstAccount = accounts[0].email;
          setActiveAccount(firstAccount);
          setEmails(emailCache[firstAccount] || []);
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            initialLoadComplete: true,
            error: err instanceof Error ? err.message : "Unknown error",
          }));
        }
      }
    }

    loadEverything();
    return () => { cancelled = true; };
  }, []); // Only run once on mount

  // When active account changes, pull from cache (instant!)
  useEffect(() => {
    if (!activeAccount) return;

    const cached = getCachedEmails(activeAccount);
    if (cached) {
      setEmails(cached);
      // Update unread count
      setState((s) => ({
        ...s,
        accounts: s.accounts.map((acc) =>
          acc.email === activeAccount
            ? { ...acc, unreadCount: cached.filter((e) => !e.read).length }
            : acc
        ),
      }));
    } else if (state.initialLoadComplete) {
      // Cache miss after initial load - fetch it
      setState((s) => ({ ...s, loading: true }));
      fetchEmailsForAccount(activeAccount).then((emailList) => {
        setEmails(emailList);
        setState((s) => ({
          ...s,
          loading: false,
          accounts: s.accounts.map((acc) =>
            acc.email === activeAccount
              ? { ...acc, unreadCount: emailList.filter((e) => !e.read).length }
              : acc
          ),
        }));
      });
    }
  }, [activeAccount, getCachedEmails, fetchEmailsForAccount, state.initialLoadComplete]);

  // Manual refresh - invalidates cache for current account
  const refresh = useCallback(async (force?: boolean) => {
    if (!activeAccount) return;

    // Clear cache for this account (or all accounts if forced)
    if (force) {
      Object.keys(emailCache).forEach(key => {
        delete emailCache[key];
        delete cacheTimestamps[key];
      });
    } else {
      delete emailCache[activeAccount];
      delete cacheTimestamps[activeAccount];
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const emailList = await fetchEmailsForAccount(activeAccount);
      setEmails(emailList);
      setState((s) => ({
        ...s,
        loading: false,
        accounts: s.accounts.map((acc) =>
          acc.email === activeAccount
            ? { ...acc, unreadCount: emailList.filter((e) => !e.read).length }
            : acc
        ),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [activeAccount, fetchEmailsForAccount]);

  return {
    accounts: state.accounts,
    emails,
    loading: state.loading,
    error: state.error,
    activeAccount,
    setActiveAccount,
    refresh,
  };
}
