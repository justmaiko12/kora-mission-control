// Settings storage for Mission Control customization

export interface AppSettings {
  avatarUrl: string | null; // Custom uploaded avatar URL (data URL or external)
  avatarEmoji: string; // Fallback emoji if no image
  appName: string; // Customizable app name
}

const SETTINGS_KEY = "kora_mission_control_settings";

const defaultSettings: AppSettings = {
  avatarUrl: null,
  avatarEmoji: "🦞",
  appName: "Kora",
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return defaultSettings;
  }
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const newSettings = { ...current, ...updates };
  
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  } catch (e) {
    console.error("Failed to save settings:", e);
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
