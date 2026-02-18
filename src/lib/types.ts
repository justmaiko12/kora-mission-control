export type FocusedItemType = "email" | "task" | "notification";

export interface FocusedItem {
  type: FocusedItemType;
  id: string;
  title: string;
  preview: string;
  metadata: Record<string, unknown>;
}
