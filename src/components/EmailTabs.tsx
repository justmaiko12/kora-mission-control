"use client";

import { useState, useEffect, useRef } from "react";

interface EmailAccount {
  id: string;
  email: string;
  name: string;
  provider: "gmail" | "outlook" | "other";
  unreadCount: number;
}

interface EmailTabsProps {
  accounts: EmailAccount[];
  activeAccount: string;
  onChange: (accountId: string) => void;
}

const STORAGE_KEY = "kora-email-tab-names-v3";

export default function EmailTabs({ accounts, activeAccount, onChange }: EmailTabsProps) {
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from API (with localStorage fallback)
  useEffect(() => {
    setMounted(true);
    
    // Try API first
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.emailTabNames && Object.keys(data.emailTabNames).length > 0) {
          console.log("[EmailTabs] Loaded from API:", data.emailTabNames);
          setCustomNames(data.emailTabNames);
          // Sync to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.emailTabNames));
        } else {
          // Fallback to localStorage
          loadFromLocalStorage();
        }
      })
      .catch(() => {
        console.log("[EmailTabs] API unavailable, using localStorage");
        loadFromLocalStorage();
      });
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const validated: Record<string, string> = {};
          for (const [key, value] of Object.entries(parsed)) {
            if (typeof key === "string" && typeof value === "string") {
              validated[key] = value;
            }
          }
          console.log("[EmailTabs] Loaded from localStorage:", validated);
          setCustomNames(validated);
        }
      }
    } catch (err) {
      console.error("[EmailTabs] Failed to load from localStorage:", err);
    }
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleDoubleClick = (accountId: string, currentName: string) => {
    setEditingId(accountId);
    setEditValue(currentName);
  };

  const handleSave = async (accountId: string) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      const updated = { ...customNames, [accountId]: trimmed };
      setCustomNames(updated);
      
      // Save to localStorage immediately
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("[EmailTabs] localStorage save failed:", err);
      }
      
      // Save to API for persistence across devices
      try {
        await fetch("/api/settings/email-tabs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tabNames: { [accountId]: trimmed } }),
        });
        console.log("[EmailTabs] Saved to API:", { [accountId]: trimmed });
      } catch (err) {
        console.error("[EmailTabs] API save failed (localStorage backup exists):", err);
      }
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, accountId: string) => {
    if (e.key === "Enter") {
      handleSave(accountId);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const getDisplayName = (account: EmailAccount): string => {
    if (mounted && customNames[account.email]) {
      const name = customNames[account.email];
      return typeof name === "string" ? name : String(name);
    }
    if (mounted && customNames[account.id]) {
      const name = customNames[account.id];
      return typeof name === "string" ? name : String(name);
    }
    return account.email?.split("@")[0] || "Email";
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      {accounts.map((account) => {
        const isActive = account.id === activeAccount;
        const isEditing = editingId === account.email;
        const displayName = getDisplayName(account);

        return (
          <div key={account.id} className="relative">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave(account.email)}
                onKeyDown={(e) => handleKeyDown(e, account.email)}
                className="py-2 px-3 text-sm font-medium bg-zinc-800 border border-indigo-500 rounded-lg text-white outline-none w-24"
                maxLength={20}
              />
            ) : (
              <button
                onClick={() => onChange(account.id)}
                onDoubleClick={() => handleDoubleClick(account.email, displayName)}
                title="Double-click to rename"
                className={`relative py-2.5 px-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] rounded-lg ${
                  isActive ? "text-indigo-300 bg-zinc-800/50" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{displayName}</span>
                  {account.unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-600 text-white min-w-[18px] text-center">
                      {account.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
