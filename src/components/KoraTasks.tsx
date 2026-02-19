"use client";

import { useCallback, useEffect, useState } from "react";
import InlineChat from "./InlineChat";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "blocked" | "completed";
  dueDate?: string;
  blockedReason?: string;
  createdAt: string;
  updatedAt?: string;
}

const priorityColors = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const statusColors = {
  pending: "bg-zinc-500/20 text-zinc-400",
  "in-progress": "bg-blue-500/20 text-blue-400",
  blocked: "bg-red-500/20 text-red-400",
  completed: "bg-green-500/20 text-green-400",
};

export default function KoraTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return task.status !== "completed";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const addTask = async () => {
    if (!newTaskTitle.trim() || saving) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          priority: "medium",
        }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks([data.task, ...tasks]);
        setNewTaskTitle("");
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task: Task, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = task.status === "completed" ? "pending" : "completed";
    
    // Optimistic update
    setTasks(tasks.map((t) => 
      t.id === task.id ? { ...t, status: newStatus } : t
    ));
    
    // If this was the selected task and it's now completed, deselect it
    if (selectedTask?.id === task.id && newStatus === "completed") {
      setSelectedTask(null);
    }

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          status: newStatus,
        }),
      });
    } catch (err) {
      console.error("Failed to update task:", err);
      // Revert on error
      setTasks(tasks);
    }
  };

  // Handle task completion from chat
  const handleCompleteSelectedTask = () => {
    if (selectedTask && selectedTask.status !== "completed") {
      toggleComplete(selectedTask);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Build context for chat
  const buildChatContext = () => {
    if (selectedTask) {
      return `Selected task: "${selectedTask.title}" (ID: ${selectedTask.id}, Status: ${selectedTask.status}, Priority: ${selectedTask.priority})${selectedTask.description ? `, Description: ${selectedTask.description}` : ""}`;
    }
    return `Viewing ${activeTasks.length} active tasks`;
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const isSelected = selectedTask?.id === task.id;
    
    return (
      <div
        onClick={() => setSelectedTask(isSelected ? null : task)}
        className={`p-4 rounded-xl border transition-all cursor-pointer ${
          task.status === "completed"
            ? "bg-zinc-900/30 border-zinc-800/50 opacity-60"
            : isSelected
            ? "bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/50"
            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={(e) => toggleComplete(task, e)}
            className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 transition-all ${
              task.status === "completed"
                ? "bg-green-500 border-green-500"
                : "border-zinc-600 hover:border-indigo-500"
            }`}
          >
            {task.status === "completed" && (
              <span className="text-white text-xs flex items-center justify-center">✓</span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`font-medium text-sm ${
                  task.status === "completed" ? "line-through text-zinc-500" : ""
                }`}
              >
                {task.title}
              </h3>
              <span className={`px-2 py-0.5 text-xs rounded border ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded ${statusColors[task.status]}`}>
                {task.status.replace("-", " ")}
              </span>
              {isSelected && (
                <span className="px-2 py-0.5 text-xs rounded bg-indigo-600 text-white">
                  Selected
                </span>
              )}
            </div>
            {task.description && (
              <p className="text-sm text-zinc-500 mt-1">{task.description}</p>
            )}
            {task.blockedReason && (
              <p className="text-sm text-red-400 mt-1">⚠️ {task.blockedReason}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
              {task.dueDate && <span>Due: {task.dueDate}</span>}
              <span>Created: {formatDate(task.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Tasks Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-lg md:text-xl font-bold">📋 Kora's Tasks</h1>
              <p className="text-xs md:text-sm text-zinc-500">
                {loading ? "Loading..." : `${activeTasks.length} active tasks`}
                {selectedTask && <span className="text-indigo-400"> • 1 selected</span>}
              </p>
            </div>
            <div className="flex gap-1 md:gap-2">
              {(["all", "active", "completed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-lg transition-colors capitalize ${
                    filter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Add Task */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a new task for Kora..."
              className="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={addTask}
              disabled={saving || !newTaskTitle.trim()}
              className="px-4 md:px-5 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl font-medium text-sm transition-colors"
            >
              {saving ? "Adding..." : "Add Task"}
            </button>
          </div>
        </div>

        {/* Selected Task Banner */}
        {selectedTask && (
          <div className="px-4 py-2 bg-indigo-950/50 border-b border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-indigo-400">Working on:</span>
              <span className="font-medium truncate">{selectedTask.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCompleteSelectedTask}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
              >
                ✓ Mark Done
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-zinc-500 animate-pulse">Loading tasks...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <span className="text-4xl">📋</span>
              <p className="mt-2">No tasks yet</p>
              <p className="text-sm">Add a task above to get started</p>
            </div>
          </div>
        )}

        {/* Task List */}
        {!loading && tasks.length > 0 && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Active Tasks */}
            {activeTasks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Active ({activeTasks.length})
                </h2>
                <div className="space-y-2">
                  {activeTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && filter !== "active" && (
              <div>
                <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Completed ({completedTasks.length})
                </h2>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div className="h-64 lg:h-full lg:w-96 border-t lg:border-t-0 lg:border-l border-zinc-800 flex-shrink-0">
        <InlineChat
          contextType="tasks"
          contextId={selectedTask?.id || "tasks"}
          contextLabel={selectedTask ? `Task: ${selectedTask.title}` : "Tasks"}
          contextData={buildChatContext()}
          onTaskComplete={handleCompleteSelectedTask}
        />
      </div>
    </div>
  );
}
