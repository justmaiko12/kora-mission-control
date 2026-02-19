import { FocusedItem } from "@/lib/types";

export interface ChannelFilter {
  type: "keyword" | "sender" | "label" | "custom";
  value: string;
  sources: ("email" | "tasks" | "notifications" | "chat")[];
}

export interface CustomChannel {
  id: string;
  name: string;
  emoji: string;
  filter: ChannelFilter;
  createdAt: string;
}

export interface ChannelSuggestion {
  name: string;
  emoji: string;
  filter: ChannelFilter;
}

const STORAGE_KEY = "kora-custom-channels";
export const CUSTOM_CHANNELS_EVENT = "custom-channels-updated";

// No default channels - user creates their own
const defaultChannels: CustomChannel[] = [];

const isBrowser = () => typeof window !== "undefined";

const loadFromStorage = (): CustomChannel[] => {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomChannel[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveToStorage = (channels: CustomChannel[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
};

export const emitCustomChannelsUpdated = (channels: CustomChannel[]) => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(CUSTOM_CHANNELS_EVENT, { detail: channels }));
};

export const onCustomChannelsUpdated = (handler: (channels: CustomChannel[]) => void) => {
  if (!isBrowser()) return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<CustomChannel[]>).detail;
    if (detail) {
      handler(detail);
    }
  };
  window.addEventListener(CUSTOM_CHANNELS_EVENT, listener);
  return () => window.removeEventListener(CUSTOM_CHANNELS_EVENT, listener);
};

export const listCustomChannels = async (): Promise<CustomChannel[]> => {
  try {
    const response = await fetch("/api/channels");
    if (!response.ok) {
      throw new Error("Failed to fetch channels");
    }
    const payload = await response.json();
    if (payload?.channels) {
      saveToStorage(payload.channels);
      return payload.channels;
    }
  } catch {
    // Fall back to local storage below.
  }

  const channels = loadFromStorage();
  return channels;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const ensureUniqueId = (base: string, existing: CustomChannel[]) => {
  let id = base || "custom-channel";
  let counter = 1;
  while (existing.some((channel) => channel.id === id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  return id;
};

export const createCustomChannel = async (suggestion: ChannelSuggestion): Promise<CustomChannel> => {
  const storedChannels = loadFromStorage();
  const id = ensureUniqueId(slugify(suggestion.name), storedChannels);
  const newChannel: CustomChannel = {
    id,
    name: suggestion.name,
    emoji: suggestion.emoji,
    filter: suggestion.filter,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  try {
    const response = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newChannel),
    });
    if (response.ok) {
      const payload = await response.json();
      if (payload?.channels) {
        saveToStorage(payload.channels);
        emitCustomChannelsUpdated(payload.channels);
      }
      return newChannel;
    }
  } catch {
    // Continue to local storage fallback.
  }

  const updatedChannels = [...storedChannels, newChannel];
  saveToStorage(updatedChannels);
  emitCustomChannelsUpdated(updatedChannels);
  return newChannel;
};

export const deleteCustomChannel = async (id: string) => {
  try {
    const response = await fetch(`/api/channels?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (response.ok) {
      const payload = await response.json();
      if (payload?.channels) {
        saveToStorage(payload.channels);
        emitCustomChannelsUpdated(payload.channels);
      }
      return;
    }
  } catch {
    // Continue to local storage fallback.
  }

  const storedChannels = loadFromStorage();
  const updatedChannels = storedChannels.filter((channel) => channel.id !== id);
  saveToStorage(updatedChannels);
  emitCustomChannelsUpdated(updatedChannels);
};

export const buildSuggestionFromFocus = (focusedItem: FocusedItem | null): ChannelSuggestion | null => {
  if (!focusedItem) return null;
  const keyword = focusedItem.title.split(" ").slice(0, 2).join(" ");
  return {
    name: `${focusedItem.title} Focus`,
    emoji: "✨",
    filter: {
      type: "keyword",
      value: keyword,
      sources: focusedItem.type === "email" ? ["email"] : ["tasks"],
    },
  };
};
