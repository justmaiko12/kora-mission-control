"use client";

import { useCallback, useEffect, useState } from "react";

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
  emails: EmailThread[];
  loading: boolean;
  error: string | null;
}

export function useEmails() {
  const [state, setState] = useState<EmailsState>({
    accounts: [],
    emails: [],
    loading: true,
    error: null,
  });
  const [activeAccount, setActiveAccount] = useState<string>("");

  // Fetch accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch("/api/emails");
        if (!res.ok) throw new Error("Failed to fetch accounts");
        const data = await res.json();
        const accounts: EmailAccount[] = (data.accounts || []).map(
          (acc: { email: string; name: string }) => ({
            id: acc.email,
            email: acc.email,
            name: acc.name || acc.email.split("@")[1]?.split(".")[0] || "Email",
            provider: "gmail" as const,
            unreadCount: 0,
          })
        );
        setState((s) => ({ ...s, accounts, loading: accounts.length === 0 }));
        if (accounts.length > 0 && !activeAccount) {
          setActiveAccount(accounts[0].email);
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    }
    fetchAccounts();
  }, [activeAccount]);

  // Fetch emails when account changes
  useEffect(() => {
    if (!activeAccount) return;

    async function fetchEmails() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(
          `/api/emails?account=${encodeURIComponent(activeAccount)}&query=newer_than:7d&max=30`
        );
        if (!res.ok) throw new Error("Failed to fetch emails");
        const data = await res.json();

        const emails: EmailThread[] = (data.emails || []).map(
          (email: EmailThread) => ({
            ...email,
            read: !email.labels?.includes("UNREAD"),
          })
        );

        // Update unread count for this account
        setState((s) => ({
          ...s,
          emails,
          loading: false,
          accounts: s.accounts.map((acc) =>
            acc.email === activeAccount
              ? { ...acc, unreadCount: emails.filter((e: EmailThread) => !e.read).length }
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
    }
    fetchEmails();
  }, [activeAccount]);

  const refresh = useCallback(() => {
    if (activeAccount) {
      setState((s) => ({ ...s, loading: true }));
      fetch(
        `/api/emails?account=${encodeURIComponent(activeAccount)}&query=newer_than:7d&max=30`
      )
        .then((res) => res.json())
        .then((data) => {
          setState((s) => ({
            ...s,
            emails: data.emails || [],
            loading: false,
          }));
        })
        .catch((err) => {
          setState((s) => ({
            ...s,
            loading: false,
            error: err.message,
          }));
        });
    }
  }, [activeAccount]);

  return {
    ...state,
    activeAccount,
    setActiveAccount,
    refresh,
  };
}
