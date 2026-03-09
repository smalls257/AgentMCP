export type AgentStatus = 'active' | 'thinking' | 'awaiting-input' | 'idle' | 'error';

export interface Agent {
    id: string;
    name: string;
    providerId: string;
    type: 'primary' | 'subagent';
    status: AgentStatus;
    currentTask?: string;
    parentId?: string;
    children: string[];
    lastActiveAt: number;
}

export interface Workspace {
    id: string;
    name: string;
    path: string;
    branch: string;
    goal: string;
    hasUncommittedChanges: boolean;
    agents: Agent[];
}

export interface Message {
    id: string;
    agentId: string;
    content: string;
    timestamp: number;
    role: 'user' | 'agent';
}

export interface Artifact {
    id: string;
    agentId: string;
    type: 'file' | 'code' | 'output';
    name: string;
    timestamp: number;
    content: string;
    changes?: string;
}

export interface Task {
    id: string;
    agentId: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high';
    description: string;
}
