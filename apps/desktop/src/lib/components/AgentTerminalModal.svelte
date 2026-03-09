<script lang="ts">
  import { X, Minimize2, Maximize2, Terminal, ListTodo, FileCode, Code } from "lucide-svelte";
  import type { Agent, Message, Task, Artifact } from "$lib/types";
  import Badge from "./ui/Badge.svelte";
  import ScrollArea from "./ui/ScrollArea.svelte";
  import Input from "./ui/Input.svelte";
  import Button from "./ui/Button.svelte";

  let {
    agent,
    messages = [],
    tasks = [],
    artifacts = [],
    onClose,
    onSendMessage
  }: {
    agent: Agent;
    messages: Message[];
    tasks: Task[];
    artifacts: Artifact[];
    onClose: () => void;
    onSendMessage: (msg: string) => void;
  } = $props();

  let input = $state("");
  let isMaximized = $state(false);
  let sidePanel = $state<"tasks" | "artifacts" | null>(null);
  let showRawTerminal = $state(false);
  let terminalOutput = $state("");

  function handleSend() {
    if (input.trim()) {
      onSendMessage(input.trim());
      input = "";
    }
  }

  function toggleTerminalView() {
    showRawTerminal = !showRawTerminal;
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "active": return "bg-green-500";
      case "thinking": return "bg-blue-500 animate-pulse";
      case "idle": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  }

  function getStateColor(state: string) {
    switch (state) {
      case "processing": return "text-blue-400";
      case "awaiting-input": return "text-orange-400";
      case "error": return "text-red-400";
      case "idle": return "text-gray-400";
      default: return "text-gray-400";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "in-progress": return "⏳";
      case "blocked": return "🚫";
      case "pending": return "⏸";
      case "completed": return "✓";
      default: return "○";
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high": return "text-red-400";
      case "medium": return "text-yellow-400";
      case "low": return "text-gray-400";
      default: return "text-gray-400";
    }
  }

  // Derived filtered arrays
  let activeTasks = $derived(tasks.filter((t) => t.status !== "completed"));
  let taskCount = $derived(tasks.length);
  // Using generic mock data for `agent.state` & `agent.branch` since our `Agent` type doesn't map to the mockup 1:1 yet
  let agentBranch = "main";
  let agentState = "idle";
  
  function formatTimestamp(ts: number) {
       const date = new Date(ts);
       return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
   }

   // Handle pty-output events from Rust
   import { onMount } from 'svelte';
   import { listen } from '@tauri-apps/api/event';

   onMount(() => {
     let unlisten: (() => void) | undefined;
     const setup = async () => {
       try {
         unlisten = await listen<{agentId: string, type: string, data?: string}>('pty-output', (event) => {
           const { agentId, type, data } = event.payload;
           // Only update if this is our agent
           if (agentId === agent.id) {
             if (type === 'terminal_output' && data) {
               terminalOutput += data;
             } else if (type === 'terminal_exit') {
               terminalOutput += '\n[Process exited]\n';
             }
           }
         });
       } catch (err) {
         console.error("Failed to setup pty-output listener:", err);
       }
     };
     setup();
     return () => {
       if (unlisten) unlisten();
     };
   });
</script>

<div
  class="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden {isMaximized ? 'fixed inset-4 z-50' : 'h-full w-full relative'}"
>
  <!-- Terminal Header -->
  <div class="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <Terminal class="size-4 text-green-400" />
      <div class="flex items-center gap-2">
        <span class="text-green-400 font-mono text-sm">
          {agent.name.toLowerCase().replace(/\s+/g, "-")}@workspace
        </span>
        <div class="size-2 rounded-full {getStatusColor(agent.status)}"></div>
      </div>
      <span class="text-xs font-mono {getStateColor(agentState)}">
        [{agentState}]
      </span>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={() => (isMaximized = !isMaximized)}
        class="text-gray-400 hover:text-white transition-colors cursor-pointer"
      >
        {#if isMaximized}
          <Minimize2 class="size-4" />
        {:else}
          <Maximize2 class="size-4" />
        {/if}
      </button>
      <button
        onclick={onClose}
        class="text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
      >
        <X class="size-4" />
      </button>
    </div>
  </div>

  <!-- Agent Info Bar -->
  <div class="bg-gray-850 border-b border-gray-700 px-4 py-2 flex items-center justify-between text-xs font-mono">
    <div class="flex items-center gap-4 text-gray-400">
      <span>
        <span class="text-gray-500">branch:</span>
        <span class="text-blue-400">{agentBranch}</span>
      </span>
      {#if agent.currentTask}
        <span class="text-gray-500">
          task: <span class="text-gray-300">{agent.currentTask}</span>
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-3 text-gray-500">
      <span>{formatTimestamp(agent.lastActiveAt)}</span>
      {#if taskCount > 0}
        <Badge className="bg-blue-900 text-blue-300 border-blue-700 text-xs">
          {taskCount} tasks
        </Badge>
      {/if}
    </div>
  </div>

 <!-- Main Content Area -->
   <div class="flex-1 flex overflow-hidden min-h-0">
     
     <!-- Raw Terminal View (when showRawTerminal is true) -->
     {#if showRawTerminal}
       <div class="flex-1 flex flex-col overflow-hidden bg-gray-950">
         <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
           <span class="text-xs font-mono text-gray-400">Raw Terminal Output</span>
           <button onclick={toggleTerminalView} class="text-xs text-green-400 hover:text-white font-mono">
             <Code class="size-3 inline" /> Chat View
           </button>
         </div>
         <ScrollArea className="flex-1 p-4 font-mono text-sm whitespace-pre-wrap text-gray-300">
           {terminalOutput}
         </ScrollArea>
       </div>
     {:else}
     <!-- Chat Panel - Always Visible -->
     <div class="flex-1 flex flex-col overflow-hidden {sidePanel ? 'border-r border-gray-700' : ''}">
       <ScrollArea className="flex-1 p-4">
         <div class="space-y-3 font-mono text-sm">
           {#each messages as message (message.id)}
             <div class="space-y-1">
               <div class="flex items-center gap-2">
                 <span class={message.role === "user" ? "text-blue-400" : "text-green-400"}>
                   {#if message.role === "user"}
                     user
                   {:else}
                     {agent.name.toLowerCase().replace(/\s+/g, "-")}@
                   {/if}
                 </span>
                 <span class="text-gray-500 text-xs">{formatTimestamp(message.timestamp)}</span>
               </div>
               <div class="text-gray-300 pl-4 whitespace-pre-wrap">
                 {message.content}
               </div>
             </div>
           {/each}
         </div>
       </ScrollArea>
     {/if}

      <!-- Input -->
      <div class="border-t border-gray-700 p-4 bg-gray-850">
        <div class="flex gap-2">
          <span class="text-green-400 font-mono text-sm self-center">$</span>
          <Input
            bind:value={input}
            onkeydown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            class="flex-1 bg-gray-900 border-gray-700 text-gray-300 font-mono text-sm focus:border-green-400 focus:ring-green-400"
          />
          <Button
            onclick={handleSend}
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white font-mono text-sm"
          >
            send
          </Button>
        </div>
      </div>
    </div>

    <!-- Side Panel - Tasks or Artifacts -->
    {#if sidePanel}
      <div class="w-96 flex flex-col overflow-hidden bg-gray-850 border-l border-gray-700">
        <div class="border-b border-gray-700 px-4 py-2 flex items-center justify-between">
          <span class="text-green-400 font-mono text-sm">
            {#if sidePanel === "tasks"}
              tasks ({activeTasks.length})
            {:else}
              artifacts ({artifacts.length})
            {/if}
          </span>
          <button
            onclick={() => (sidePanel = null)}
            class="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X class="size-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          {#if sidePanel === "tasks"}
            <div class="p-4 space-y-3 font-mono text-sm">
              {#if activeTasks.length === 0}
                <div class="text-center py-12 text-gray-500">
                  <div class="text-4xl mb-2">✓</div>
                  <div>No active tasks</div>
                </div>
              {:else}
                {#each activeTasks as task (task.id)}
                  <div class="bg-gray-800 border border-gray-700 rounded p-3 space-y-2">
                    <div class="flex items-start gap-2">
                      <span class="text-lg">{getStatusIcon(task.status)}</span>
                      <div class="flex-1 space-y-1">
                        <div class="text-gray-200">{task.title}</div>
                        <div class="text-xs text-gray-400">{task.description}</div>
                        <div class="flex items-center gap-3 text-xs">
                          <span class="text-gray-500">
                            status: <span class="text-blue-400">{task.status}</span>
                          </span>
                          <span class="text-gray-500">
                            priority: <span class={getPriorityColor(task.priority)}>{task.priority}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          {:else}
            <div class="p-4 space-y-3 font-mono text-sm">
              {#if artifacts.length === 0}
                <div class="text-center py-12 text-gray-500">
                  <div class="text-4xl mb-2">📁</div>
                  <div>No artifacts yet</div>
                </div>
              {:else}
                {#each artifacts as artifact (artifact.id)}
                  <div class="bg-gray-800 border border-gray-700 rounded p-3 space-y-2 hover:border-green-600 transition-colors cursor-pointer">
                    <div class="flex items-center justify-between">
                      <span class="text-green-400">{artifact.name}</span>
                      <Badge className="bg-purple-900 text-purple-300 border-purple-700 text-xs font-mono">
                        {artifact.type}
                      </Badge>
                    </div>
                    <div class="text-xs text-gray-400 line-clamp-2 overflow-hidden">{artifact.content}</div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-gray-500">{formatTimestamp(artifact.timestamp)}</span>
                      {#if artifact.changes}
                        <span class="text-green-400 font-mono">{artifact.changes}</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}
        </ScrollArea>
      </div>
    {/if}
  </div>

  <!-- Bottom Tab Bar -->
   <div class="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center gap-2">
     <button
       onclick={toggleTerminalView}
       class="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs transition-colors cursor-pointer {showRawTerminal ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}"
     >
       <Code class="size-3" />
       {#if showRawTerminal}
         Chat View
       {:else}
         Terminal
       {/if}
     </button>
     <button
       onclick={() => (sidePanel = sidePanel === "tasks" ? null : "tasks")}
       class="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs transition-colors cursor-pointer {sidePanel === 'tasks' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}"
     >
       <ListTodo class="size-3" />
       tasks ({activeTasks.length})
     </button>
     <button
       onclick={() => (sidePanel = sidePanel === "artifacts" ? null : "artifacts")}
       class="flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs transition-colors cursor-pointer {sidePanel === 'artifacts' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}"
     >
       <FileCode class="size-3" />
       artifacts ({artifacts.length})
     </button>
     <div class="flex-1"></div>
     <span class="text-xs font-mono text-gray-500">
       {messages.length} messages
     </span>
   </div>
</div>
