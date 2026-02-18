"use client";

interface Integration {
  id: string;
  name: string;
  icon: string;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  description: string;
}

interface Tool {
  name: string;
  description: string;
  available: boolean;
}

const integrations: Integration[] = [
  { id: "github", name: "GitHub", icon: "🐙", status: "connected", lastSync: "Just now", description: "Repository access for justmaiko12" },
  { id: "telegram", name: "Telegram", icon: "📱", status: "connected", lastSync: "Active", description: "Connected as @KoraBot" },
  { id: "discord", name: "Discord", icon: "💬", status: "connected", lastSync: "Active", description: "Shluv server + Kreatrix" },
  { id: "notion", name: "Notion", icon: "📝", status: "connected", lastSync: "2 min ago", description: "Master Tasks + Master Content databases" },
  { id: "gmail", name: "Gmail", icon: "📧", status: "disconnected", description: "Email integration for briefings" },
  { id: "calendar", name: "Google Calendar", icon: "📅", status: "disconnected", description: "Calendar sync for scheduling" },
  { id: "slack", name: "Slack", icon: "💼", status: "disconnected", description: "Workspace messaging" },
];

const tools: Tool[] = [
  { name: "exec", description: "Run shell commands on the host machine", available: true },
  { name: "read / write / edit", description: "File operations in workspace", available: true },
  { name: "web_search", description: "Search the web via Brave API", available: true },
  { name: "web_fetch", description: "Fetch and extract content from URLs", available: true },
  { name: "browser", description: "Browser automation and control", available: true },
  { name: "cron", description: "Schedule recurring tasks and reminders", available: true },
  { name: "message", description: "Send messages to connected channels", available: true },
  { name: "memory_search", description: "Search through memory files", available: true },
  { name: "nodes", description: "Control paired devices (iOS, macOS)", available: true },
  { name: "sessions_spawn", description: "Create sub-agent sessions", available: true },
  { name: "tts", description: "Text-to-speech conversion", available: true },
  { name: "image", description: "Analyze images with vision models", available: true },
];

export default function Integrations() {
  const connectedIntegrations = integrations.filter((i) => i.status === "connected");
  const disconnectedIntegrations = integrations.filter((i) => i.status !== "connected");

  const IntegrationCard = ({ integration }: { integration: Integration }) => (
    <div
      className={`p-4 rounded-xl border transition-all ${
        integration.status === "connected"
          ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
          : "bg-zinc-900/30 border-zinc-800/50 opacity-70"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl">
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{integration.name}</h3>
            <span
              className={`w-2 h-2 rounded-full ${
                integration.status === "connected"
                  ? "bg-green-500"
                  : integration.status === "error"
                  ? "bg-red-500"
                  : "bg-zinc-500"
              }`}
            />
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{integration.description}</p>
          {integration.lastSync && (
            <p className="text-xs text-zinc-600 mt-1">Last sync: {integration.lastSync}</p>
          )}
        </div>
        <button
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            integration.status === "connected"
              ? "bg-zinc-800 hover:bg-zinc-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {integration.status === "connected" ? "Settings" : "Connect"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">🔌 Integrations</h1>
          <p className="text-zinc-500 text-sm md:text-base mt-1">Connected services and available tools</p>
        </div>

        {/* Connected Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Connected ({connectedIntegrations.length})
          </h2>
          <div className="grid gap-3">
            {connectedIntegrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>

        {/* Disconnected Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            Available ({disconnectedIntegrations.length})
          </h2>
          <div className="grid gap-3">
            {disconnectedIntegrations.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>

        {/* Tools */}
        <div>
          <h2 className="text-lg font-semibold mb-4">🛠️ Available Tools</h2>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-2">
            {tools.map((tool) => (
              <div key={tool.name} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <code className="text-indigo-400 text-sm">{tool.name}</code>
                  {tool.available ? (
                    <span className="text-green-500 text-xs">✓ Active</span>
                  ) : (
                    <span className="text-zinc-500 text-xs">—</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{tool.description}</p>
              </div>
            ))}
          </div>
          {/* Desktop: Table */}
          <div className="hidden md:block bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-400">Tool</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-zinc-400">Description</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.name} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3">
                      <code className="text-indigo-400 text-sm">{tool.name}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{tool.description}</td>
                    <td className="px-4 py-3 text-center">
                      {tool.available ? (
                        <span className="text-green-500 text-sm">✓ Active</span>
                      ) : (
                        <span className="text-zinc-500 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* OpenClaw Status */}
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl md:text-3xl">
              🦞
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold">OpenClaw Gateway</h3>
              <p className="text-zinc-400 text-sm mt-1">Running on KORA's Mac mini</p>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                <span className="text-xs md:text-sm text-green-400">● Connected</span>
                <span className="text-xs md:text-sm text-zinc-500">v2026.2.9</span>
                <span className="text-xs md:text-sm text-zinc-500">Claude Opus</span>
              </div>
            </div>
            <button className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
              View Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}