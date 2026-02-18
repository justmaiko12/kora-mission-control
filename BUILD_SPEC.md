# Mission Control - App Launcher & Invoicer Integration

## Overview
Add two new features to Kora Mission Control:
1. **App Launcher** - Quick links to all Michael's apps in the sidebar
2. **Invoicer Dashboard** - View and manage payables from Internal-Promo-Invoicer

---

## Feature 1: App Launcher

### Location
Add to the sidebar navigation, below existing items.

### Apps List
```typescript
const apps = [
  { name: 'Kreatrix AI', url: 'https://kreatrix.vercel.app', emoji: '🎨' },
  { name: 'Flow-State Calendar', url: 'https://flow-state-calendar.vercel.app', emoji: '📅' },
  { name: 'Internal Invoicer', url: 'https://internal-promo-invoicer.vercel.app', emoji: '💰' },
  { name: 'SnapTasks', url: 'https://snaptasks.vercel.app', emoji: '📸' },
  { name: 'Dance Trainer', url: 'https://dance-trainer.vercel.app', emoji: '💃' },
  { name: 'Saigon BonBon', url: 'https://saigon-bonbon.vercel.app', emoji: '🍜' },
];
```

### UI
- Collapsible "Apps" section in sidebar
- Each app shows emoji + name
- Click opens in new tab
- Small external link icon on hover

---

## Feature 2: Invoicer Dashboard (Payables View)

### New Route
`/payables` - dedicated page for viewing payables

### Add to Navigation
Add "Payables" link in sidebar with 💸 emoji

### Supabase Connection
```typescript
// Environment variables to add:
// INVOICER_SUPABASE_URL=https://dpnsdxfiirqjztcfsvuj.supabase.co
// INVOICER_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbnNkeGZpaXJxanp0Y2ZzdnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MzIwMjksImV4cCI6MjA4MDMwODAyOX0.AgdwRyftEOa18f62UaL1I1_QsBE6JGVAiQ_3mmaOqvw

import { createClient } from '@supabase/supabase-js';

const invoicerSupabase = createClient(
  process.env.INVOICER_SUPABASE_URL!,
  process.env.INVOICER_SUPABASE_ANON_KEY!
);
```

### API Routes

#### GET /api/payables
Fetch pending payables from Supabase:
```sql
SELECT * FROM expense_payables 
WHERE status IN ('planned', 'approved', 'partial')
ORDER BY due_date ASC
```

#### GET /api/payables/submissions
Fetch pending expense submissions:
```sql
SELECT * FROM expense_submissions
WHERE status = 'submitted'
ORDER BY submitted_at DESC
```

### Payables Page UI

#### Summary Cards (top)
- Total Pending: sum of all unpaid amounts
- Due This Week: count + sum
- Overdue: count + sum (red highlight)

#### Payables Table
Columns:
- Vendor Name
- Title/Description
- Amount (formatted as currency)
- Due Date (highlight if overdue)
- Status (badge: planned/approved/partial/paid)
- Actions (View Details button)

#### Filters
- Status filter (All, Pending, Partial, Paid)
- Date range filter
- Search by vendor name

### Types
```typescript
type ExpensePayableStatus = 'planned' | 'approved' | 'partial' | 'paid' | 'cancelled';

interface ExpensePayable {
  id: string;
  ownerCompanyId: string;
  submissionId?: string;
  title: string;
  vendorName: string;
  vendorEmail: string;
  invoiceDate?: string;
  dueDate: string;
  amount: number;
  currency: string;
  paymentMethod: 'ach' | 'wire' | 'paypal' | 'check' | 'cash' | 'other';
  paymentDetails?: string;
  notes?: string;
  status: ExpensePayableStatus;
  paidAmount?: number;
  paymentHistory?: PaymentRecord[];
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  note?: string;
}
```

---

## Implementation Order
1. Add Supabase client for invoicer (`src/lib/invoicerSupabase.ts`)
2. Create API routes (`src/app/api/payables/route.ts`)
3. Add Payables page (`src/app/payables/page.tsx`)
4. Add App Launcher to sidebar
5. Update sidebar navigation

---

## Feature 3: Crew Dashboard (Agent Visualization)

### New Route
`/crew` - dedicated page showing all agents

### Add to Navigation
Add "Crew" link in sidebar with 🧠 emoji

### UI Concept
Visual command center showing Kora + sub-agents:

#### Main View
- **Center**: Kora (main agent) - large avatar/icon
- **Orbiting**: Sub-agents when active (smaller icons)
- **Status indicators**: 
  - 🟢 Active (glowing animation)
  - 💤 Idle (dimmed)
  - ⏳ Working (pulsing)

#### Agent Cards
Each agent shows:
- Name/ID
- Current task (if active)
- Status badge
- Last activity timestamp

#### Data Source
Pulls from OpenClaw API via Kora Bridge:
- GET /api/crew/sessions - list active sessions
- Shows main session + any spawned sub-agents
- Shows active cron jobs

### Components
```typescript
// Agent status types
type AgentStatus = 'active' | 'idle' | 'working';

interface AgentInfo {
  id: string;
  name: string;
  type: 'main' | 'sub-agent' | 'cron';
  status: AgentStatus;
  currentTask?: string;
  lastActivity: string;
}
```

### Animations
- Idle agents: subtle breathing/pulse
- Active agents: rotating glow ring
- Working agents: progress dots animation
- New agent spawn: fade-in with scale

### Layout Options
1. **Orbital view**: Kora center, agents orbit (fun, visual)
2. **Grid view**: Cards in a grid (practical, info-dense)
3. **Toggle between views**

---

## Styling
Match existing Mission Control design:
- Dark theme
- Card-based layout
- Tailwind CSS classes
- Consistent with existing components
