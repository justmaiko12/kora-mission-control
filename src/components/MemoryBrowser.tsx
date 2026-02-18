"use client";

import { useState } from "react";

interface MemoryFile {
  name: string;
  path: string;
  type: "core" | "daily" | "project";
  lastModified: string;
  preview?: string;
}

const memoryFiles: MemoryFile[] = [
  { name: "MEMORY.md", path: "MEMORY.md", type: "core", lastModified: "Today", preview: "Long-term memory and key information about Michael..." },
  { name: "SOUL.md", path: "SOUL.md", type: "core", lastModified: "Feb 15", preview: "Core personality and communication style..." },
  { name: "USER.md", path: "USER.md", type: "core", lastModified: "Feb 10", preview: "Information about Michael - preferences, timezone..." },
  { name: "AGENTS.md", path: "AGENTS.md", type: "core", lastModified: "Feb 12", preview: "Operating rules and session guidelines..." },
  { name: "2026-02-17.md", path: "memory/2026-02-17.md", type: "daily", lastModified: "Today", preview: "OpenClaw connection, Kora platform setup..." },
  { name: "2026-02-16.md", path: "memory/2026-02-16.md", type: "daily", lastModified: "Yesterday", preview: "Automation challenges, integration needs..." },
  { name: "2026-02-15.md", path: "memory/2026-02-15.md", type: "daily", lastModified: "2 days ago", preview: "Notion-Discord webhook work..." },
  { name: "kora-app-prd.md", path: "memory/kora-app-prd.md", type: "project", lastModified: "Feb 15", preview: "Product requirements document for Kora app..." },
  { name: "notion-integration.md", path: "memory/notion-integration.md", type: "project", lastModified: "Feb 15", preview: "Notion API credentials and database IDs..." },
  { name: "pending-tasks.md", path: "memory/pending-tasks.md", type: "project", lastModified: "Feb 15", preview: "Tasks waiting to be completed..." },
];

export default function MemoryBrowser() {
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = memoryFiles.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const coreFiles = filteredFiles.filter((f) => f.type === "core");
  const dailyFiles = filteredFiles.filter((f) => f.type === "daily");
  const projectFiles = filteredFiles.filter((f) => f.type === "project");

  const FileItem = ({ file }: { file: MemoryFile }) => (
    <button
      onClick={() => setSelectedFile(file)}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selectedFile?.path === file.path
          ? "bg-indigo-600/20 border-indigo-500/30"
          : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">📄</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-zinc-500">{file.lastModified}</p>
        </div>
      </div>
    </button>
  );

  // Mobile: File Detail View (full screen overlay)
  const MobileFileDetail = () => {
    if (!selectedFile) return null;
    return (
      <div className="md:hidden absolute inset-0 z-10 bg-zinc-950 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <button
            onClick={() => setSelectedFile(null)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{selectedFile.name}</h2>
            <p className="text-xs text-zinc-500">Last modified: {selectedFile.lastModified}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 mb-4">
            <button className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
              Edit
            </button>
            <button className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
              Ask Kora
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <p className="text-zinc-400">{selectedFile.preview}</p>
            <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-500">
                Full file content will be loaded from OpenClaw workspace.
                <br />
                Path: <code className="text-indigo-400 text-xs">~/.openclaw/workspace/{selectedFile.path}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex relative">
      {/* Mobile File Detail Overlay */}
      <MobileFileDetail />

      {/* File Browser - full width on mobile, fixed width on desktop */}
      <div className="w-full md:w-80 md:border-r border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-zinc-800">
          <h1 className="text-lg md:text-xl font-bold mb-3">🧠 Kora's Memory</h1>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory..."
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Core Files */}
          <div>
            <h2 className="px-2 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              📁 Core Files
            </h2>
            <div className="space-y-1">
              {coreFiles.map((file) => (
                <FileItem key={file.path} file={file} />
              ))}
            </div>
          </div>

          {/* Daily Logs */}
          <div>
            <h2 className="px-2 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              📅 Daily Logs
            </h2>
            <div className="space-y-1">
              {dailyFiles.map((file) => (
                <FileItem key={file.path} file={file} />
              ))}
            </div>
          </div>

          {/* Project Notes */}
          <div>
            <h2 className="px-2 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              📂 Project Notes
            </h2>
            <div className="space-y-1">
              {projectFiles.map((file) => (
                <FileItem key={file.path} file={file} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* File Preview - desktop only */}
      <div className="hidden md:flex flex-1 flex-col">
        {selectedFile ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedFile.name}</h2>
                <p className="text-sm text-zinc-500">Last modified: {selectedFile.lastModified}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
                  Edit
                </button>
                <button className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                  Ask Kora about this
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-zinc-400">{selectedFile.preview}</p>
                <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-500">
                    Full file content will be loaded from OpenClaw workspace.
                    <br />
                    Path: <code className="text-indigo-400">~/.openclaw/workspace/{selectedFile.path}</code>
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <span className="text-4xl">📄</span>
              <p className="mt-2">Select a file to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
