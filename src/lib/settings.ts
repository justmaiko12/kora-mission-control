// Settings storage for Mission Control customization
// Syncs to Bridge API for cross-device persistence

export interface AppSettings {
  avatarUrl: string | null; // Custom uploaded avatar URL (data URL or external)
  avatarEmoji: string; // Fallback emoji if no image
  appName: string; // Customizable app name
  emailTabNames?: Record<string, string>; // Custom email tab names
}

const SETTINGS_KEY = "kora_mission_control_settings";

const defaultSettings: AppSettings = {
  avatarUrl: null,
  avatarEmoji: "🦞",
  appName: "Kora",
};

// In-memory cache of settings
let cachedSettings: AppSettings | null = null;

export function getSettings(): AppSettings {
  if (cachedSettings) return cachedSettings;
  if (typeof window === "undefined") return defaultSettings;
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    cachedSettings = { ...defaultSettings, ...JSON.parse(stored) };
    return cachedSettings;
  } catch {
    return defaultSettings;
  }
}

// Sync settings from API (call on app load)
export async function syncSettingsFromAPI(): Promise<AppSettings> {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const apiSettings = await res.json();
      const merged = { ...defaultSettings, ...apiSettings };
      cachedSettings = merged;
      // Update localStorage as cache
      if (typeof window !== "undefined") {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("settings-updated", { detail: merged }));
      }
      return merged;
    }
  } catch (err) {
    console.error("Failed to sync settings from API:", err);
  }
  return getSettings();
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const current = getSettings();
  const newSettings = { ...current, ...updates };
  cachedSettings = newSettings;
  
  // Save to localStorage immediately
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    }
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
  }
  
  // Sync to API in background
  try {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  } catch (e) {
    console.error("Failed to sync settings to API:", e);
  }
  
  // Dispatch event so components can react
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("settings-updated", { detail: newSettings }));
  }
  
  return newSettings;
}

export function onSettingsChange(callback: (settings: AppSettings) => void): () => void {
  if (typeof window === "undefined") return () => {};
  
  const handler = (e: Event) => {
    callback((e as CustomEvent<AppSettings>).detail);
  };
  
  window.addEventListener("settings-updated", handler);
  return () => window.removeEventListener("settings-updated", handler);
}

// Convert file to data URL for storage
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
