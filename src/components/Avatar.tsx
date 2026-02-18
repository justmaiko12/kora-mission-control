"use client";

import { useEffect, useState } from "react";
import { getSettings, onSettingsChange, AppSettings } from "@/lib/settings";

interface AvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-lg",
  md: "w-10 h-10 text-xl",
  lg: "w-12 h-12 text-2xl",
  xl: "w-16 h-16 text-3xl",
};

export default function Avatar({ size = "md", className = "" }: AvatarProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(getSettings());
    return onSettingsChange(setSettings);
  }, []);

  const sizeClass = sizeClasses[size];

  // Show loading placeholder during hydration
  if (!settings) {
    return (
      <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ${className}`}>
        <span className="opacity-50">...</span>
      </div>
    );
  }

  if (settings.avatarUrl) {
    return (
      <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden ${className}`}>
        <img 
          src={settings.avatarUrl} 
          alt="Avatar" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ${className}`}>
      {settings.avatarEmoji}
    </div>
  );
}
