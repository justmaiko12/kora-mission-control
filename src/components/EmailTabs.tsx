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

const STORAGE_KEY = "email-tab-names";

function getStoredNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setStoredNames(names: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
}

export default function EmailTabs({ accounts, activeAccount, onChange }: EmailTabsProps) {
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCustomNames(getStoredNames());
  }, []);

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

  const handleSave = (accountId: string) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      const updated = { ...customNames, [accountId]: trimmed };
      setCustomNames(updated);
      setStoredNames(updated);
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

  const getDisplayName = (account: EmailAccount) => {
    if (customNames[account.id]) {
      return customNames[account.id];
    }
    // Default: username part of email
    return account.email.split("@")[0];
  };

  return (
    <div className="flex items-center gap-1 px-2 overflow-x-auto">
      {accounts.map((account) => {
        const isActive = account.id === activeAccount;
        const isEditing = editingId === account.id;
        const displayName = getDisplayName(account);

        return (
          <div key={account.id} className="relative">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave(account.id)}
                onKeyDown={(e) => handleKeyDown(e, account.id)}
                className="py-1 px-2 text-xs font-medium bg-zinc-800 border border-indigo-500 rounded text-white outline-none w-24"
                maxLength={20}
              />
            ) : (
              <button
                onClick={() => onChange(account.id)}
                onDoubleClick={() => handleDoubleClick(account.id, displayName)}
                title="Double-click to rename"
                className={`relative py-2 px-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive ? "text-indigo-300" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{displayName}</span>
                  {account.unreadCount > 0 && (
                    <span className="px-1 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-600 text-white min-w-[16px] text-center">
                      {account.unreadCount}
                    </span>
                  )}
                </div>
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-500 rounded-full" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
