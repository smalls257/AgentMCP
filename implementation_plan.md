# Agent Mission Control — Implementation Plan

A high-performance native desktop app for managing, monitoring, and steering AI agents across workspaces.

---

## 1. Provider Abstraction Layer (The Core)

Everything depends on this. One interface, many providers. Swap freely.

### The Contract

```typescript
// Every provider implements this — this is the thing that makes swapping possible
interface AgentProvider {
  id: string;                 // 'copilot' | 'claude' | 'gemini' | 'openrouter'
  name: string;               // Display name
  
  // Can this provider do sub-agents? MCP tools? etc.
  capabilities: Set<'chat' | 'agent' | 'subagent' | 'mcp'>;
  
  // Lifecycle
  spawn(config: SpawnConfig): Promise<AgentHandle>;
  send(handle: AgentHandle, message: string): void;
  interrupt(handle: AgentHandle): void;
  kill(handle: AgentHandle): void;
  
  // Streaming output — all providers normalize to the same event stream
  onEvent(handle: AgentHandle, cb: (event: AgentEvent) => void): Disposable;
  
  // Sub-agent awareness (optional — not all providers support this)
  getSubAgents?(handle: AgentHandle): SubAgentInfo[];
}

// Normalized events — no matter which CLI/API is underneath
type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; tool: string; input: any }
  | { type: 'tool_result'; tool: string; output: any }
  | { type: 'status_change'; status: AgentStatus }
  | { type: 'subagent_spawned'; id: string; task: string }
  | { type: 'subagent_completed'; id: string; result: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
```

### How Each Provider Maps to the Interface

| Capability | Copilot SDK | Claude Agent SDK | Gemini CLI | OpenRouter |
|---|---|---|---|---|
| **npm package** | `@github/copilot-sdk` | `@anthropic-ai/claude-agent-sdk` | `@google/gemini-cli` (spawn as subprocess) | `@openrouter/sdk` |
| **Communication** | JSON-RPC to CLI process | SSE streaming | Subprocess stdin/stdout | HTTP REST (OpenAI-compatible) |
| **Streaming** | ✅ built-in | ✅ SSE events | ✅ stdout stream | ✅ `stream: true` |
| **Tool calling** | ✅ custom tools | ✅ built-in tools | ✅ built-in tools | ✅ function calling |
| **Sub-agents** | ✅ `/fleet`, `/delegate` | ✅ native subagents | ⚠️ roadmap | ❌ N/A (API only) |
| **MCP support** | ✅ | ✅ | ✅ | ❌ |
| **Auth** | GitHub token | Anthropic API key | Google OAuth | OpenRouter API key |

> [!IMPORTANT]
> **Copilot SDK** uses JSON-RPC — it manages the CLI process lifecycle for you. You don't spawn `gh copilot` directly. The SDK handles that. This is the cleanest abstraction of the bunch, and why it's a good first provider.

---

## 2. Architecture

### Why Tauri 2 + Svelte?

| | Tauri + Svelte | Electron + React |
|--|--|--|
| **Binary size** | ~6MB | ~150MB |
| **Memory** | Uses OS native webview | Bundles full Chromium |
| **Frontend runtime** | None — Svelte compiles away | React runtime stays |
| **Backend** | Rust (fast, safe process management) | Node.js |
| **IPC** | Tauri commands (type-safe) | `ipcMain`/`ipcRenderer` |

**Svelte** compiles your UI to plain JS/HTML at build time — no virtual DOM, no framework overhead at runtime. Perfect pairing with Tauri's native webview.

**Tauri's Rust backend** is ideal for this app specifically because managing multiple CLI child processes (Copilot, Claude, Gemini) is exactly what Rust is great at — async, safe, no GC pauses.

```
┌────────────────────────────────────────────────┐
│           Frontend (Svelte → compiled JS)       │
│   WorkspaceSidebar │ ConversationPanels │ ...   │
│            ↕ Tauri IPC commands                 │
├────────────────────────────────────────────────┤
│              Rust Backend (Tauri)               │
│  ┌──────────────────────────────────────────┐  │
│  │           Agent Orchestrator             │  │
│  │  async process management, event routing │  │
│  │  parent/child agent tree, SQLite state   │  │
│  └─────────────┬────────────────────────────┘  │
│  ┌─────────────┴────────────────────────────┐  │
│  │           Provider Registry              │  │
│  └──┬──────┬────────────┬────────────┬───────┘  │
│     │      │            │            │           │
│  Copilot Claude      Gemini      OpenRouter      │
│  Adapter Adapter     Adapter     Adapter         │
└────────────────────────────────────────────────┘
```

> [!NOTE]
> The provider adapters themselves may use Node.js SDKs (like `@github/copilot-sdk`). Tauri can spawn a Node sidecar process for this — a thin JS bridge that the Rust backend talks to via stdio. This keeps Rust coordinating everything while still letting us use npm SDK packages.

### Monorepo Layout

```
agent-mcp/                        # root
├── apps/
│   └── desktop/                  # Tauri app
│       ├── src/                  # Svelte frontend
│       │   ├── lib/
│       │   │   ├── components/   # WorkspaceSidebar, ConversationPanel, etc.
│       │   │   └── stores/       # Svelte stores (agent state, workspace state)
│       │   └── routes/           # SvelteKit pages
│       └── src-tauri/            # Rust backend
│           ├── src/
│           │   ├── main.rs
│           │   ├── orchestrator/ # Agent lifecycle, process management
│           │   └── commands.rs   # Tauri IPC commands
│           └── Cargo.toml
├── packages/
│   └── provider-sidecar/         # Node.js process (npm SDK bridge)
│       ├── src/
│       │   ├── index.ts          # stdio IPC server
│       │   └── providers/
│       │       ├── interface.ts  # AgentProvider contract
│       │       ├── mock.ts       # Mock provider (no subscription needed)
│       │       ├── copilot.ts    # @github/copilot-sdk adapter
│       │       ├── claude.ts     # @anthropic-ai/claude-agent-sdk adapter
│       │       ├── gemini.ts     # @google/gemini-cli adapter
│       │       └── openrouter.ts # @openrouter/sdk adapter
│       └── package.json
└── package.json                  # npm workspaces root
```

---

## 3. Data Model

```typescript
// Simplified from mockup — status/state merged, timestamps not strings
interface Agent {
  id: string;
  name: string;
  providerId: string;     // which provider is running this
  type: 'primary' | 'subagent';
  status: 'active' | 'thinking' | 'awaiting-input' | 'idle' | 'error';
  currentTask?: string;
  parentId?: string;       // if subagent, who spawned me
  children: string[];      // sub-agent IDs
  lastActiveAt: number;    // unix timestamp
}

interface Workspace {
  id: string;
  name: string;
  path: string;            // filesystem path
  branch: string;
  goal: string;
  hasUncommittedChanges: boolean;
  agents: Agent[];         // flat list (tree constructed from parentId)
}
```

> [!TIP]
> Dropped `Project` as an intermediate layer between Workspace and Agent. A workspace maps directly to a directory. If you need project grouping later, it can be added — but it's overhead for now.

---

## 4. UI Components (Referencing Your Mockup)

| Component | Source | Changes Needed |
|---|---|---|
| `WorkspaceSidebar` | Mockup ✅ | Remove `Project` nesting, simplify status colors |
| `ConversationPanel` | Mockup ✅ | Add pop-out button (↗) |
| `TasksArtifactsPanel` | Mockup ✅ | Minor cleanup |
| `MainLayout` | Mockup ✅ | Wire to real state instead of mock data |
| **`ConversationModal`** | **NEW** | Pop-out: full chat + condensed status bar + bottom tabs for tasks/artifacts |
| **`StatusBar`** | **NEW** | Condensed horizontal pills (task count, artifact count, branch, uncommitted) |

---

## 5. Build Phases

| Phase | What | Details |
|---|---|---|
| **1. Scaffold** | Tauri 2 + Svelte project | `cargo tauri init` + Svelte frontend. Tauri IPC bridge. SQLite via `rusqlite`. |
| **2. Provider interface** | Define contract + Node sidecar | `AgentProvider` TypeScript interface, Node sidecar process for npm SDK access, Tauri spawns and talks to it via stdio. |
| **3. Mock + Copilot adapter** | Provider sidecar | Build `mock.ts` first (works without any subscription). Wire up `@github/copilot-sdk` when ready — it's just swapping the adapter. |
| **4. Orchestrator** | Rust agent management | Spawn agents, track sessions, parent/child tree, route events via Tauri events to frontend. |
| **5. UI** | Svelte components | Workspace sidebar, conversation panels, tasks/artifacts tabs — referencing your Figma mockup design. |
| **6. Pop-out** | Conversation modal | Pop-out with condensed status bar and bottom tabs. |
| **7. More providers** | Claude, Gemini, OpenRouter | One at a time — each just a new adapter in the Node sidecar. |

### Phase 2 Deep Dive: Copilot Adapter

```typescript
// Pseudocode — what the Copilot adapter looks like
import { CopilotSession } from '@github/copilot-sdk';

class CopilotProvider implements AgentProvider {
  id = 'copilot';
  capabilities = new Set(['chat', 'agent', 'subagent', 'mcp']);
  
  async spawn(config: SpawnConfig): Promise<AgentHandle> {
    const session = await CopilotSession.create({
      workingDirectory: config.workspacePath,
      // SDK manages the CLI process via JSON-RPC
    });
    return { id: generateId(), session };
  }
  
  send(handle: AgentHandle, message: string) {
    handle.session.sendMessage(message);  // SDK handles streaming
  }
  
  onEvent(handle: AgentHandle, cb: (event: AgentEvent) => void) {
    // SDK emits structured events — we normalize them
    handle.session.on('response', (chunk) => {
      cb({ type: 'text', content: chunk.text });
    });
    handle.session.on('toolCall', (tool) => {
      cb({ type: 'tool_use', tool: tool.name, input: tool.args });
    });
  }
}
```

---

## 6. Decisions Made

| Question | Decision | Why |
|---|---|---|
| First provider | **GitHub Copilot SDK** | Cleanest SDK (JSON-RPC, manages process for you), most accessible |
| Tech stack | **Tauri 2 + Svelte** | ~10x smaller binary than Electron, no React runtime, Rust process management |
| Node sidecar | **Yes, for npm SDK access** | Provider SDKs are npm packages — sidecar lets us use them without compromising Tauri's Rust core |
| Data model | **Simplified** (merged status/state, dropped Project layer) | Less complexity, add back if needed |

---

## 7. Decisions — All Locked ✅

| Decision | Choice |
|---|---|
| Repo structure | **Monorepo** (`apps/desktop` + `packages/provider-sidecar`) |
| Stack | **Tauri 2 + Svelte + Rust** |
| First provider | **Mock adapter** → Copilot when subscription is ready |
| Cross-platform | ✅ Windows / macOS / Linux |
| Data model | Simplified (merged status, dropped Project layer) |
