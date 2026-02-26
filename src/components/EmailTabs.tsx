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
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load from API (with localStorage fallback)
  useEffect(() => {
    setMounted(true);
    
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.emailTabNames && Object.keys(data.emailTabNames).length > 0) {
          console.log("[EmailTabs] Loaded from API:", data.emailTabNames);
          setCustomNames(data.emailTabNames);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.emailTabNames));
        } else {
          loadFromLocalStorage();
        }
      })
      .catch(() => {
        console.log("[EmailTabs] API unavailable, using localStorage");
        loadFromLocalStorage();
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

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

  const activeAccountData = accounts.find(a => a.id === activeAccount);
  const otherAccounts = accounts.filter(a => a.id !== activeAccount);
  const totalUnread = accounts.reduce((sum, a) => sum + (a.id !== activeAccount ? a.unreadCount : 0), 0);

  const handleSelect = (accountId: string) => {
    onChange(accountId);
    setIsOpen(false);
  };

  // Handle touch for instant response (no 300ms delay)
  const handleToggleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  const handleSelectTouch = (e: React.TouchEvent, accountId: string) => {
    e.preventDefault();
    handleSelect(accountId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Active Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onTouchEnd={handleToggleTouch}
        style={{ touchAction: "manipulation" }}
        className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/70 hover:bg-zinc-800 rounded-xl transition-colors min-h-[44px]"
      >
        {/* Account name */}
        <span className="font-medium text-white">
          {activeAccountData ? getDisplayName(activeAccountData) : "Select Account"}
        </span>
        
        {/* Unread badge for current account */}
        {activeAccountData && activeAccountData.unreadCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-600 text-white min-w-[18px] text-center">
            {activeAccountData.unreadCount}
          </span>
        )}
        
        {/* Other accounts unread indicator */}
        {totalUnread > 0 && (
          <span className="w-2 h-2 rounded-full bg-amber-500" title={`${totalUnread} unread in other accounts`} />
        )}
        
        {/* Chevron */}
        <svg 
          className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && otherAccounts.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {otherAccounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleSelect(account.id)}
              onTouchEnd={(e) => handleSelectTouch(e, account.id)}
              style={{ touchAction: "manipulation" }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors text-left min-h-[48px]"
            >
              <span className="text-zinc-200 font-medium">{getDisplayName(account)}</span>
              {account.unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-600/80 text-white">
                  {account.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
