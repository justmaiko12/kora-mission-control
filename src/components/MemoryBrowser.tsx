"use client";

import { useCallback, useEffect, useState } from "react";

interface MemoryFile {
  name: string;
  path: string;
  type: "core" | "daily" | "project";
  lastModified?: string;
}

// Categorize files based on path
function categorizeFile(path: string): MemoryFile["type"] {
  if (path.startsWith("memory/") && /\d{4}-\d{2}-\d{2}\.md$/.test(path)) {
    return "daily";
  }
  if (path.startsWith("memory/")) {
    return "project";
  }
  return "core";
}

export default function MemoryBrowser() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch file list
  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch("/api/memory");
        if (!res.ok) throw new Error("Failed to fetch memory files");
        const data = await res.json();
        
        if (data.files) {
          const categorized = data.files.map((f: { name: string; lastModified?: string }) => ({
            name: f.name,
            path: f.name,
            type: categorizeFile(f.name),
            lastModified: f.lastModified,
          }));
          setFiles(categorized);
        }
      } catch (err) {
        console.error("Memory fetch error:", err);
        setError("Failed to load memory files");
      } finally {
        setLoading(false);
      }
    }
    fetchFiles();
  }, []);

  // Fetch file content when selected
  const loadFileContent = useCallback(async (file: MemoryFile) => {
    setSelectedFile(file);
    setLoadingContent(true);
    setFileContent("");
    
    try {
      const res = await fetch(`/api/memory?path=${encodeURIComponent(file.path)}`);
      if (!res.ok) throw new Error("Failed to fetch file");
      const data = await res.json();
      setFileContent(data.file?.content || data.content || "");
    } catch (err) {
      console.error("File content error:", err);
      setFileContent("Failed to load file content");
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const filteredFiles = files.filter(
    (file) => file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const coreFiles = filteredFiles.filter((f) => f.type === "core");
  const dailyFiles = filteredFiles.filter((f) => f.type === "daily").sort((a, b) => b.name.localeCompare(a.name));
  const projectFiles = filteredFiles.filter((f) => f.type === "project");

  const FileItem = ({ file }: { file: MemoryFile }) => (
    <button
      onClick={() => loadFileContent(file)}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        selectedFile?.path === file.path
          ? "bg-indigo-600/20 border-indigo-500/30"
          : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">📄</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{file.name}</p>
          {file.lastModified && (
            <p className="text-xs text-zinc-500">{file.lastModified}</p>
          )}
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
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loadingContent ? (
            <div className="text-zinc-500 animate-pulse">Loading...</div>
          ) : (
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
              {fileContent}
            </pre>
          )}
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

        {/* Loading/Error State */}
        {loading && (
          <div className="p-4 text-zinc-500 animate-pulse">Loading files...</div>
        )}
        {error && (
          <div className="p-4 text-red-400 text-sm">{error}</div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Core Files */}
          {coreFiles.length > 0 && (
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
          )}

          {/* Daily Logs */}
          {dailyFiles.length > 0 && (
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
          )}

          {/* Project Notes */}
          {projectFiles.length > 0 && (
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
          )}

          {!loading && files.length === 0 && (
            <div className="text-center text-zinc-500 py-8">
              No memory files found
            </div>
          )}
        </div>
      </div>

      {/* File Preview - desktop only */}
      <div className="hidden md:flex flex-1 flex-col">
        {selectedFile ? (
          <>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedFile.name}</h2>
                <p className="text-sm text-zinc-500">
                  {selectedFile.lastModified || "Memory file"}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingContent ? (
                <div className="text-zinc-500 animate-pulse">Loading content...</div>
              ) : (
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {fileContent}
                </pre>
              )}
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
