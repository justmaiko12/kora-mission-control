"use client";

import { useEffect, useRef, useState } from "react";
import { getSettings, updateSettings, fileToDataUrl, AppSettings } from "@/lib/settings";
import Avatar from "./Avatar";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emojiOptions = ["🦞", "🤖", "✨", "🧠", "💎", "🔮", "🌟", "🎯", "🚀", "💜", "🦊", "🐱", "🐶", "🦁", "🐼"];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getSettings();
      setSettings(current);
      setPreviewUrl(current.avatarUrl);
    }
  }, [isOpen]);

  if (!isOpen || !settings) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be less than 2MB");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setPreviewUrl(dataUrl);
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  const handleSave = () => {
    updateSettings({
      avatarUrl: previewUrl,
      avatarEmoji: settings.avatarEmoji,
      appName: settings.appName,
    });
    onClose();
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Avatar
            </label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden flex items-center justify-center text-3xl">
                {previewUrl ? (
                  <img src={previewUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  settings.avatarEmoji
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Upload Image
                </button>
                {previewUrl && (
                  <button
                    onClick={handleRemoveImage}
                    className="w-full px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Emoji Fallback */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">
              Fallback Emoji
            </label>
            <div className="flex flex-wrap gap-2">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSettings({ ...settings, avatarEmoji: emoji })}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    settings.avatarEmoji === emoji
                      ? "bg-indigo-600 ring-2 ring-indigo-400"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* App Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              App Name
            </label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              placeholder="Kora"
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
