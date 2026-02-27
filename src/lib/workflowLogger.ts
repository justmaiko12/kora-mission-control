/**
 * workflowLogger.ts - Agent Workflow Tracking Service
 * Logs task assignments, completions, feedback, and decisions
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dpnsdxfiirqjztcfsvuj.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbnNkeGZpaXJxanp0Y2ZzdnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MzIwMjksImV4cCI6MjA4MDMwODAyOX0.AgdwRyftEOa18f62UaL1I1_QsBE6JGVAiQ_3mmaOqvw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkflowTask {
  taskId: string;
  agentId: string;
  taskType: string;
  priority?: 'low' | 'medium' | 'high';
  contextLength?: number;
  taskDescription: string;
}

export interface WorkflowFeedback {
  taskId: string;
  approvalScore: number;       // 1-10
  feedback?: string;
  revisionRound?: number;
  timeToCompletionMinutes?: number;
}

export interface AgentDecision {
  agentId: string;
  decisionType: string;
  agentChose: string;
  agentConfidence?: number;    // 0-100
  youChose?: string;
  outcomeNotes?: string;
}

export interface WorkflowFriction {
  agentId: string;
  taskType?: string;
  originalTaskId?: string;
  problemType: string;
  timeToFixMinutes: number;
  yourFix?: string;
  rootCause?: string;
  preventionSuggestion?: string;
}

// ─── Task Assignment ────────────────────────────────────────────────────────

/**
 * Log a new task assignment to an agent
 */
export async function logTaskAssignment(params: WorkflowTask): Promise<string> {
  const { data, error } = await supabase
    .from('agent_workflows')
    .insert({
      task_id: params.taskId,
      agent_id: params.agentId,
      task_type: params.taskType,
      priority: params.priority ?? 'medium',
      context_length: params.contextLength ?? null,
      task_description: params.taskDescription,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to log task assignment: ${error.message}`);
  }

  return (data.id as string);
}

// ─── Task Feedback ──────────────────────────────────────────────────────────

/**
 * Log feedback on an agent's completed task
 */
export async function logTaskFeedback(params: WorkflowFeedback): Promise<void> {
  const approvalStatus = params.approvalScore >= 8 ? 'approved' 
    : params.approvalScore >= 5 ? 'needs_revision' 
    : 'rejected';

  const { error } = await supabase
    .from('agent_workflows')
    .update({
      approval_score: params.approvalScore,
      your_response: approvalStatus,
      feedback_notes: params.feedback ?? null,
      revision_round: params.revisionRound ?? 0,
      time_to_completion_minutes: params.timeToCompletionMinutes ?? null,
      your_feedback_at: new Date().toISOString(),
    })
    .eq('task_id', params.taskId);

  if (error) {
    throw new Error(`Failed to log task feedback: ${error.message}`);
  }
}

// ─── Agent Decision ─────────────────────────────────────────────────────────

/**
 * Log an agent's decision and your response
 */
export async function logAgentDecision(params: AgentDecision): Promise<string> {
  const { data, error } = await supabase
    .from('agent_decisions')
    .insert({
      agent_id: params.agentId,
      decision_type: params.decisionType,
      agent_chose: params.agentChose,
      agent_confidence: params.agentConfidence ?? null,
      you_chose: params.youChose ?? null,
      outcome_notes: params.outcomeNotes ?? null,
      outcome_type: params.youChose ? 
        (params.youChose === params.agentChose ? 'agent_correct' : 'user_correct') 
        : 'wait_for_30days',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to log agent decision: ${error.message}`);
  }

  return (data.id as string);
}

// ─── Workflow Friction ──────────────────────────────────────────────────────

/**
 * Log a workflow friction point (when you had to fix agent work)
 */
export async function logWorkflowFriction(params: WorkflowFriction): Promise<string> {
  const { data, error } = await supabase
    .from('workflow_friction')
    .insert({
      agent_id: params.agentId,
      task_type: params.taskType ?? null,
      original_task_id: params.originalTaskId ?? null,
      problem_type: params.problemType,
      time_to_fix_minutes: params.timeToFixMinutes,
      your_fix: params.yourFix ?? null,
      root_cause: params.rootCause ?? null,
      prevention_suggestion: params.preventionSuggestion ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to log workflow friction: ${error.message}`);
  }

  return (data.id as string);
}

// ─── Query Functions ────────────────────────────────────────────────────────

/**
 * Get all workflows for an agent with optional filtering
 */
export async function getAgentWorkflows(agentId: string, limit: number = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from('agent_workflows')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get agent workflows: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Get approval statistics for an agent
 */
export async function getAgentStats(agentId: string, days: number = 30): Promise<{
  totalTasks: number;
  approvedTasks: number;
  averageApprovalScore: number;
  approvalRate: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('agent_workflows')
    .select('approval_score')
    .eq('agent_id', agentId)
    .gte('created_at', since.toISOString());

  if (error) {
    throw new Error(`Failed to get agent stats: ${error.message}`);
  }

  const tasks = data ?? [];
  const totalTasks = tasks.length;
  const approvedTasks = tasks.filter((t) => (t.approval_score ?? 0) >= 8).length;
  const avgScore = totalTasks > 0
    ? tasks.reduce((sum, t) => sum + (t.approval_score ?? 0), 0) / totalTasks
    : 0;

  return {
    totalTasks,
    approvedTasks,
    averageApprovalScore: Math.round(avgScore * 10) / 10,
    approvalRate: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0,
  };
}

/**
 * Get specialization data for an agent-tasktype combination
 */
export async function getSpecialization(agentId: string, taskType?: string): Promise<any> {
  if (taskType) {
    const { data, error } = await supabase
      .from('agent_specialization')
      .select('*')
      .eq('agent_id', agentId)
      .eq('task_type', taskType)
      .single();

    if (error && !error.message.includes('No rows found')) {
      throw new Error(`Failed to get specialization: ${error.message}`);
    }

    return data;
  } else {
    const { data, error } = await supabase
      .from('agent_specialization')
      .select('*')
      .eq('agent_id', agentId)
      .order('your_trust_score', { ascending: false });

    if (error && !error.message.includes('No rows found')) {
      throw new Error(`Failed to get specialization: ${error.message}`);
    }

    return data;
  }
}

/**
 * Get workflow friction points for an agent
 */
export async function getWorkflowFriction(agentId: string, limit: number = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('workflow_friction')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get workflow friction: ${error.message}`);
  }

  return data ?? [];
}
