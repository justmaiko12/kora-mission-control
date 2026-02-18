/**
 * Safely convert any value to a string for React rendering.
 * Prevents "Objects are not valid as React child" error.
 */
export function safeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(safeString).join(", ");
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "[object]";
    }
  }
  return String(val);
}

/**
 * Safely render a value, returning a string or a fallback.
 */
export function safe(val: unknown, fallback: string = ""): string {
  const result = safeString(val);
  return result || fallback;
}
