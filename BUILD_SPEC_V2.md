# Mission Control V2 - Contextual Chat & Dynamic Channels

## Overview
Three major features:
1. **Contextual Chat** - Chat becomes aware of selected items
2. **Email Account Tabs** - Separate emails by connected account
3. **Dynamic Channel Creation** - Kora can create new channels via chat

---

## Feature 1: Contextual Chat

### Concept
When user clicks on an email, task, or any item, the chat panel becomes "focused" on that item. The AI knows what you're looking at and can take actions on it.

### Implementation

#### State Management
```typescript
interface FocusedItem {
  type: 'email' | 'task' | 'notification';
  id: string;
  title: string;
  preview: string;
  metadata: Record<string, unknown>;
}

// Add to app state
const [focusedItem, setFocusedItem] = useState<FocusedItem | null>(null);
```

#### UI Changes

1. **Item Cards** - Add click handler to select/focus
```tsx
<div 
  onClick={() => setFocusedItem({ type: 'email', id: email.id, ... })}
  className={focusedItem?.id === email.id ? 'ring-2 ring-indigo-500' : ''}
>
  {/* email content */}
</div>
```

2. **Chat Panel** - Show focused item context
```tsx
{focusedItem && (
  <div className="bg-indigo-900/50 p-2 rounded mb-2 text-sm">
    <span className="opacity-60">Discussing:</span>
    <span className="ml-2">{focusedItem.title}</span>
    <button onClick={() => setFocusedItem(null)}>✕</button>
  </div>
)}
```

3. **Chat Input** - Include context in messages
When sending a message, include the focused item context so Kora knows what you're referring to.

#### Actions
When focused on an email, Kora can:
- "Reply with: ..." → Draft a reply
- "Delete this" → Mark for deletion
- "Archive" → Archive the email
- "Forward to [person]" → Forward
- "Summarize" → Provide summary

When focused on a task:
- "Mark complete" → Complete the task
- "Reschedule to [date]" → Update due date
- "Add notes: ..." → Add notes

---

## Feature 2: Email Account Tabs

### Concept
Instead of one Email view, show tabs for each connected email account.

### Data Structure
```typescript
interface EmailAccount {
  id: string;
  email: string;
  name: string; // e.g., "Personal", "Business"
  provider: 'gmail' | 'outlook' | 'other';
  unreadCount: number;
}

const emailAccounts: EmailAccount[] = [
  { id: '1', email: 'michael@shluv.com', name: 'Shluv', provider: 'gmail', unreadCount: 5 },
  { id: '2', email: 'personal@gmail.com', name: 'Personal', provider: 'gmail', unreadCount: 2 },
];
```

### UI Changes

1. **Email View** - Add tab bar at top
```tsx
<div className="flex border-b border-gray-700">
  {emailAccounts.map(account => (
    <button
      key={account.id}
      onClick={() => setActiveAccount(account.id)}
      className={activeAccount === account.id ? 'border-b-2 border-indigo-500' : ''}
    >
      {account.name}
      {account.unreadCount > 0 && (
        <span className="ml-2 bg-red-500 rounded-full px-2 text-xs">
          {account.unreadCount}
        </span>
      )}
    </button>
  ))}
</div>
```

2. **Remove Business Tab** - Consolidate into Email view
- Remove "business" from ViewType
- Remove Business nav item from sidebar
- Business emails show in the appropriate email account tab

---

## Feature 3: Dynamic Channel Creation

### Concept
Kora can suggest and create new channels/views based on conversation. User says "I want a view for dance content" and Kora creates it.

### Data Structure
```typescript
interface CustomChannel {
  id: string;
  name: string;
  emoji: string;
  filter: ChannelFilter;
  createdAt: string;
}

interface ChannelFilter {
  type: 'keyword' | 'sender' | 'label' | 'custom';
  value: string;
  sources: ('email' | 'tasks' | 'notifications')[];
}

// Store in localStorage or API
const customChannels: CustomChannel[] = [
  {
    id: 'dance-content',
    name: 'Dance Content',
    emoji: '💃',
    filter: { type: 'keyword', value: 'dance', sources: ['email', 'tasks'] },
    createdAt: '2026-02-17'
  }
];
```

### Implementation

1. **Channel Storage API**
```
GET /api/channels - List custom channels
POST /api/channels - Create new channel
DELETE /api/channels/:id - Remove channel
```

2. **Sidebar Update**
- Add "Custom Channels" section below main nav
- Show user-created channels with their emoji
- "+" button to manually add (or just use chat)

3. **Chat Command Detection**
When user says things like:
- "Create a channel for dance stuff"
- "I want to see all emails about Kreatrix"
- "Make a view for invoices"

Kora responds:
- "I'll create a 'Dance Content' channel for you! 💃"
- Creates the channel with appropriate filters
- It appears in the sidebar immediately

4. **Channel View**
Custom channels show filtered content from multiple sources based on their filter config.

---

## Implementation Order

1. **Contextual Chat** (highest impact)
   - Add focusedItem state
   - Update item cards to be clickable
   - Update ChatPanel to show context
   - Pass context to chat API

2. **Email Account Tabs**
   - Create EmailTabs component
   - Update ChannelView for email
   - Remove Business view type

3. **Dynamic Channels**
   - Create channels API
   - Add CustomChannels sidebar section
   - Add chat command detection
   - Create filtered channel view

---

## Files to Modify/Create

### Modify
- `src/app/page.tsx` - Add focusedItem state, remove business view
- `src/components/Sidebar.tsx` - Add custom channels section
- `src/components/ChannelView.tsx` - Add email tabs, item click handlers
- `src/components/ChatPanel.tsx` - Show focused item context

### Create
- `src/app/api/channels/route.ts` - Custom channels CRUD
- `src/components/EmailTabs.tsx` - Tab component for email accounts
- `src/components/ContextBadge.tsx` - Shows what item is focused
- `src/lib/channelStorage.ts` - Local storage for custom channels
