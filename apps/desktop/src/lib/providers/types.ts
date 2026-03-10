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

export type AgentEventType = 'spawn' | 'message' | 'task' | 'artifact' | 'status' | 'error' | 'complete';

export interface AgentEvent {
    type: AgentEventType;
    agentId: string;
    timestamp: number;
    payload: unknown;
}

export interface SpawnConfig {
    providerId: string;
    name: string;
    type?: 'primary' | 'subagent';
    parentId?: string;
    initialTask?: string;
    config?: Record<string, unknown>;
}

export interface AgentHandle {
    id: string;
    providerId: string;
    name: string;
    spawnConfig: SpawnConfig;
    status: AgentStatus;
    sendMessage: (content: string) => Promise<void>;
    interrupt: () => Promise<void>;
    kill: () => Promise<void>;
    onEvent: (callback: (event: AgentEvent) => void) => () => void;
    getStatus: () => AgentStatus;
}

export interface AgentProvider {
    id: string;
    name: string;
    spawnAgent: (config: SpawnConfig) => Promise<AgentHandle>;
    listAvailable: () => Promise<string[]>;
    validateConfig?: (config: Record<string, unknown>) => boolean;
}
