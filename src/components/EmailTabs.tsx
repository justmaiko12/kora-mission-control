"use client";

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

export default function EmailTabs({ accounts, activeAccount, onChange }: EmailTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-zinc-800 px-4 overflow-x-auto">
      {accounts.map((account) => {
        const isActive = account.id === activeAccount;
        return (
          <button
            key={account.id}
            onClick={() => onChange(account.id)}
            className={`relative py-3 px-3 text-sm font-medium transition-colors whitespace-nowrap ${
              isActive ? "text-indigo-300" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Show full email address */}
              <span className="text-xs">{account.email}</span>
              {account.unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-600 text-white min-w-[20px] text-center">
                  {account.unreadCount}
                </span>
              )}
            </div>
            {isActive && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
