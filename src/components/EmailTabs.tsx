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
    <div className="flex items-center gap-1 px-2 overflow-x-auto">
      {accounts.map((account) => {
        const isActive = account.id === activeAccount;
        // Show just the username part for compactness
        const shortEmail = account.email.split("@")[0];
        return (
          <button
            key={account.id}
            onClick={() => onChange(account.id)}
            className={`relative py-2 px-2 text-xs font-medium transition-colors whitespace-nowrap ${
              isActive ? "text-indigo-300" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{shortEmail}</span>
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
        );
      })}
    </div>
  );
}
