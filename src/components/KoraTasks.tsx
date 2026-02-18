"use client";

import { useState } from "react";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "blocked" | "completed";
  dueDate?: string;
  blockedReason?: string;
  createdAt: string;
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Set up Notion webhook automation",
    description: "Create real-time webhook integration for task status notifications",
    priority: "high",
    status: "in-progress",
    dueDate: "Today",
    createdAt: "Feb 15",
  },
  {
    id: "2",
    title: "Connect Gmail API for morning briefings",
    description: "Integrate Gmail to pull important emails into daily briefings",
    priority: "medium",
    status: "pending",
    dueDate: "This week",
    createdAt: "Feb 16",
  },
  {
    id: "3",
    title: "Build editor task ping automation",
    description: "Auto-ping editors on Discord when tasks need review",
    priority: "medium",
    status: "blocked",
    blockedReason: "Waiting for Notion API access verification",
    createdAt: "Feb 15",
  },
  {
    id: "4",
    title: "Set up Kora heartbeat service",
    description: "Create persistent connection to Kora platform",
    priority: "high",
    status: "completed",
    createdAt: "Feb 17",
  },
  {
    id: "5",
    title: "Build Mission Control dashboard",
    description: "Create the main dashboard interface for managing everything",
    priority: "high",
    status: "in-progress",
    dueDate: "Today",
    createdAt: "Feb 17",
  },
];

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
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return task.status !== "completed";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const activeTasks = filteredTasks.filter((t) => t.status !== "completed");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      priority: "medium",
      status: "pending",
      createdAt: "Just now",
    };
    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <div
      className={`p-4 rounded-xl border transition-all ${
        task.status === "completed"
          ? "bg-zinc-900/30 border-zinc-800/50 opacity-60"
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            setTasks(
              tasks.map((t) =>
                t.id === task.id
                  ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
                  : t
              )
            );
          }}
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
              className={`font-medium ${
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
          </div>
          {task.description && (
            <p className="text-sm text-zinc-500 mt-1">{task.description}</p>
          )}
          {task.blockedReason && (
            <p className="text-sm text-red-400 mt-1">⚠️ {task.blockedReason}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
            {task.dueDate && <span>Due: {task.dueDate}</span>}
            <span>Created: {task.createdAt}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold">📋 Kora's Tasks</h1>
            <p className="text-xs md:text-sm text-zinc-500">Things Michael has assigned to me</p>
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
            className="px-4 md:px-5 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium text-sm transition-colors"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Task List */}
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
    </div>
  );
}