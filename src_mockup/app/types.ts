export interface Workspace {
  id: string;
  name: string;
  branch: string;
  goal: string;
  hasUncommittedChanges: boolean;
  projects: Project[];
}

export interface Project {
  id: string;
  name: string;
  agents: Agent[];
}

export interface Agent {
  id: string;
  name: string;
  type: "primary" | "subagent";
  status: "active" | "idle" | "thinking";
  state: "processing" | "awaiting-input" | "idle" | "error";
  lastActive: string;
  branch?: string;
  taskCount: number;
  currentTask?: string;
  hasUncommittedChanges?: boolean;
}

export interface Message {
  id: string;
  agentId: string;
  content: string;
  timestamp: string;
  role: "user" | "agent";
}

export interface Artifact {
  id: string;
  agentId: string;
  type: "file" | "code" | "output";
  name: string;
  timestamp: string;
  content: string;
  changes?: string;
}

export interface Task {
  id: string;
  agentId: string;
  title: string;
  status: "pending" | "in-progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high";
  description: string;
}