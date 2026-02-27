/**
 * actionLogger.ts - OpenClaw Agent Action Logger
 * Logs agent actions and outcomes to Supabase for tracking and analysis
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dpnsdxfiirqjztcfsvuj.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbnNkeGZpaXJxanp0Y2ZzdnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MzIwMjksImV4cCI6MjA4MDMwODAyOX0.AgdwRyftEOa18f62UaL1I1_QsBE6JGVAiQ_3mmaOqvw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Action {
  id: string;
  agent_id: string;
  action_type: string;
  input_context: object | null;
  output_result: object | null;
  model_used: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_cents: number | null;
  session_id: string | null;
  created_at: string;
}

export interface Outcome {
  id: string;
  action_id: string;
  outcome_type: string;
  outcome_value: number | null;
  outcome_quality: 'positive' | 'negative' | 'neutral' | null;
  notes: string | null;
  measured_at: string;
}

export interface Stats {
  agent: string;
  period_days: number;
  total_actions: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_cents: number;
  by_type: Record<string, number>;
  by_model: Record<string, number>;
  avg_tokens_in: number;
  avg_tokens_out: number;
}

// ─── Log Action ─────────────────────────────────────────────────────────────

/**
 * Log an agent action to Supabase.
 * @returns The action UUID (use this to link outcomes later)
 */
export async function logAction(params: {
  agentId: string;
  actionType: string;
  inputContext?: object;
  outputResult?: object;
  modelUsed?: string;
  tokensIn?: number;
  tokensOut?: number;
  costCents?: number;
  sessionId?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      agent_id: params.agentId,
      action_type: params.actionType,
      input_context: params.inputContext ?? null,
      output_result: params.outputResult ?? null,
      model_used: params.modelUsed ?? null,
      tokens_in: params.tokensIn ?? null,
      tokens_out: params.tokensOut ?? null,
      cost_cents: params.costCents ?? null,
      session_id: params.sessionId ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to log action: ${error.message}`);
  }

  return data.id as string;
}

// ─── Log Outcome ─────────────────────────────────────────────────────────────

/**
 * Record the outcome of a previously logged action.
 */
export async function logOutcome(params: {
  actionId: string;
  outcomeType: string;
  outcomeValue?: number;
  outcomeQuality?: 'positive' | 'negative' | 'neutral';
  notes?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('action_outcomes')
    .insert({
      action_id: params.actionId,
      outcome_type: params.outcomeType,
      outcome_value: params.outcomeValue ?? null,
      outcome_quality: params.outcomeQuality ?? null,
      notes: params.notes ?? null,
    });

  if (error) {
    throw new Error(`Failed to log outcome: ${error.message}`);
  }
}

// ─── Get Actions ─────────────────────────────────────────────────────────────

/**
 * Retrieve logged actions with optional filters.
 */
export async function getActions(params: {
  agentId?: string;
  actionType?: string;
  limit?: number;
  since?: Date;
} = {}): Promise<Action[]> {
  let query = supabase
    .from('agent_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (params.agentId) {
    query = query.eq('agent_id', params.agentId);
  }

  if (params.actionType) {
    query = query.eq('action_type', params.actionType);
  }

  if (params.since) {
    query = query.gte('created_at', params.since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get actions: ${error.message}`);
  }

  return (data ?? []) as Action[];
}

// ─── Get Stats ───────────────────────────────────────────────────────────────

/**
 * Get aggregated statistics for an agent over a time window.
 */
export async function getStats(agentId: string, days: number): Promise<Stats> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('agent_actions')
    .select('action_type, model_used, tokens_in, tokens_out, cost_cents')
    .eq('agent_id', agentId)
    .gte('created_at', since.toISOString());

  if (error) {
    throw new Error(`Failed to get stats: ${error.message}`);
  }

  const actions = data ?? [];
  const total_actions = actions.length;

  const total_tokens_in = actions.reduce((sum, a) => sum + (a.tokens_in ?? 0), 0);
  const total_tokens_out = actions.reduce((sum, a) => sum + (a.tokens_out ?? 0), 0);
  const total_cost_cents = actions.reduce((sum, a) => sum + (a.cost_cents ?? 0), 0);

  // Group by type
  const by_type: Record<string, number> = {};
  for (const action of actions) {
    by_type[action.action_type] = (by_type[action.action_type] ?? 0) + 1;
  }

  // Group by model
  const by_model: Record<string, number> = {};
  for (const action of actions) {
    const model = action.model_used ?? 'unknown';
    by_model[model] = (by_model[model] ?? 0) + 1;
  }

  return {
    agent: agentId,
    period_days: days,
    total_actions,
    total_tokens_in,
    total_tokens_out,
    total_cost_cents,
    by_type,
    by_model,
    avg_tokens_in: total_actions > 0 ? Math.round(total_tokens_in / total_actions) : 0,
    avg_tokens_out: total_actions > 0 ? Math.round(total_tokens_out / total_actions) : 0,
  };
}

// ─── Get Action with Outcomes ─────────────────────────────────────────────────

/**
 * Get a single action with all its outcomes.
 */
export async function getActionWithOutcomes(actionId: string): Promise<{
  action: Action;
  outcomes: Outcome[];
} | null> {
  const { data: action, error: actionError } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('id', actionId)
    .single();

  if (actionError || !action) return null;

  const { data: outcomes, error: outcomesError } = await supabase
    .from('action_outcomes')
    .select('*')
    .eq('action_id', actionId)
    .order('measured_at', { ascending: true });

  if (outcomesError) {
    throw new Error(`Failed to get outcomes: ${outcomesError.message}`);
  }

  return {
    action: action as Action,
    outcomes: (outcomes ?? []) as Outcome[],
  };
}
