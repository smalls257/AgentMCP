<script lang="ts">
  import { onMount } from 'svelte';
  import AgentTerminalModal from '$lib/components/AgentTerminalModal.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import type { Workspace, Agent, Message, Task, Artifact } from '$lib/types';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';

  let workspaces = $state<Workspace[]>([]);
  let selectedWorkspace = $state<string | null>(null);
  let selectedAgents = $state<string[]>([]);
  let activeConversationAgent = $state<Agent | null>(null);
  let showRightPanel = $state(false);
  let showSettingsModal = $state(false);

  let messages = $state<Message[]>([]);
  let tasks = $state<Task[]>([]);
  let artifacts = $state<Artifact[]>([]);

  onMount(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        // 1. Fetch initial workspaces
        let fetchedWorkspaces: Workspace[] = await invoke('get_workspaces');
        
        // If none, maybe create one automatically for testing
        if (fetchedWorkspaces.length === 0) {
          const dummy = await invoke('create_workspace', { 
              name: 'Local Demo Workspace', 
              path: '/Users/jasonsmith/Code/AgentIde' 
          }) as Workspace;
          fetchedWorkspaces = [dummy];
        }
        
        workspaces = fetchedWorkspaces;
        if (workspaces.length > 0) {
          selectedWorkspace = workspaces[0].id;
          loadAgents(workspaces[0].id);
        }

        // 2. Listen for pty-output events from the Rust PTY manager
        unlisten = await listen<{agentId: string, type: string, data?: string}>('pty-output', (event) => {
          const { agentId, type, data } = event.payload;
          
          if (type === 'terminal_output' && data) {
            // For now, just log raw output. In Phase 11, we'll parse ANSI sequences
            console.log(`[${agentId}] ${data}`);
          } else if (type === 'terminal_exit') {
            // Update agent status to idle on exit
            workspaces = workspaces.map(w => ({
              ...w,
              agents: w.agents.map(a => a.id === agentId ? { ...a, status: 'idle' } : a)
            }));
          }
        });
      } catch (err) {
        console.error("Failed to load Tauri APIs:", err);
      }
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  });

  async function loadAgents(workspaceId: string) {
    try {
      const fetchedAgents: Agent[] = await invoke('get_agents', { workspaceId });
      
      // Update workspaces to include fetched agents
      workspaces = workspaces.map(w => 
        w.id === workspaceId ? { ...w, agents: fetchedAgents } : w
      );

      // Select first agent by default if present
      if (fetchedAgents.length > 0) {
        selectedAgents = [fetchedAgents[0].id];
      } else {
        selectedAgents = [];
      }
    } catch (err) {
      console.error("Failed to load agents", err);
    }
  }

  async function loadAgentData(agentId: string) {
    try {
      messages = await invoke('get_messages', { agentId });
      tasks = await invoke('get_tasks', { agentId });
      artifacts = await invoke('get_artifacts', { agentId });
    } catch (err) {
      console.error("Failed to load agent data", err);
    }
  }

  // Derived state to get the actual agent object from the first selection
  $effect(() => {
    if (selectedAgents.length > 0 && selectedWorkspace) {
      const id = selectedAgents[0];
      const ws = workspaces.find(w => w.id === selectedWorkspace);
      if (ws) {
        let newAgent = ws.agents.find(a => a.id === id) || null;
        if (newAgent && newAgent.id !== activeConversationAgent?.id) {
           loadAgentData(newAgent.id);
        }
        activeConversationAgent = newAgent;
      }
    } else {
      activeConversationAgent = null;
    }
  });

  function handleWorkspaceSelect(id: string) {
    selectedWorkspace = id;
    loadAgents(id);
  }

  function handleAgentSelect(id: string) {
    if (selectedAgents.includes(id)) {
      selectedAgents = selectedAgents.filter(a => a !== id);
    } else {
      selectedAgents = [id];
    }
  }

  async function handleSendMessageToAgent(agentId: string, msg: string) {
    // Optimistic UI for user message
    messages = [...messages, {
      id: crypto.randomUUID(),
      agentId,
      role: 'user',
      content: msg,
      timestamp: Date.now()
    }];

    try {
      await invoke('send_message', { agentId, message: msg });
    } catch (err) {
      console.error("Failed to send message", err);
    }
  }

  let showSpawnModal = $state(false);
  let spawnProviderId = $state("openai");
  let spawnModel = $state("");
  let spawnBaseURL = $state("");
  let spawnApiKey = $state("");
  let spawnRelativeDirectory = $state("");

  let availableModels = $state<{id: string}[]>([]);
  let isLoadingModels = $state(false);
  let resolvedBaseUrl = $state("");
  let resolvedApiKey = $state("");

  // Auto-discover models when the spawn modal opens
  $effect(() => {
    if (showSpawnModal && spawnProviderId === 'openai') {
      const fetchModels = async () => {
        isLoadingModels = true;
        try {
          // Get saved settings
          resolvedBaseUrl = await invoke<string | null>('get_setting', { key: 'openai_base_url' }) || "https://api.openai.com/v1";
          resolvedApiKey = await invoke<string | null>('get_setting', { key: 'openai_api_key' }) || "";
          
          spawnBaseURL = resolvedBaseUrl;
          spawnApiKey = resolvedApiKey;

          // Strip trailing slash if present for cleaner concatenation
          const cleanUrl = resolvedBaseUrl.endsWith('/') ? resolvedBaseUrl.slice(0, -1) : resolvedBaseUrl;
          
          const responseStr = await invoke<string>('fetch_models', { 
            url: cleanUrl,
            apiKey: resolvedApiKey || null
          });
          
          if (responseStr) {
            const data = JSON.parse(responseStr);
            if (data.data && Array.isArray(data.data)) {
               availableModels = data.data.map((m: any) => ({ id: m.id }));
               if (availableModels.length > 0 && !spawnModel) {
                 spawnModel = availableModels[0].id;
               }
            }
          }
        } catch (err) {
          console.error("Failed to discover models:", err);
          // Fallback
          availableModels = [
             { id: 'gpt-4o' },
             { id: 'gpt-4o-mini' },
             { id: 'llama-3-8b-instruct' }
          ];
          if (!spawnModel) spawnModel = 'gpt-4o-mini';
        } finally {
          isLoadingModels = false;
        }
      };
      fetchModels();
    }
  });

  async function handleSpawnAgent() {
    if (!selectedWorkspace) return;
    try {
      const configObj: any = {};
      if (spawnModel.trim()) configObj.model = spawnModel.trim();
      if (spawnBaseURL.trim()) configObj.baseURL = spawnBaseURL.trim();
      if (spawnApiKey.trim()) configObj.apiKey = spawnApiKey.trim();

      let targetWorkspacePath = workspaces.find(w => w.id === selectedWorkspace)?.path || '';
      if (spawnRelativeDirectory.trim()) {
        const cleanRoot = targetWorkspacePath.endsWith('/') ? targetWorkspacePath.slice(0, -1) : targetWorkspacePath;
        let cleanRel = spawnRelativeDirectory.trim();
        if (cleanRel.startsWith('./')) cleanRel = cleanRel.slice(2);
        if (cleanRel.startsWith('/')) cleanRel = cleanRel.slice(1);
        targetWorkspacePath = `${cleanRoot}/${cleanRel}`;
      }

      const newAgentId = await invoke('spawn_agent', {
        providerId: spawnProviderId,
        workspacePath: targetWorkspacePath,
        workspaceId: selectedWorkspace,
        config: configObj
      }) as string;
      
      // Auto-add the newly spawned agent to the active grid
      if (newAgentId && !selectedAgents.includes(newAgentId)) {
        selectedAgents = [...selectedAgents, newAgentId];
      }
      
      showSpawnModal = false;

      // Give it a short delay then reload agents
      setTimeout(() => {
        if (selectedWorkspace) loadAgents(selectedWorkspace);
      }, 500);
    } catch (err) {
      console.error("Failed to spawn agent", err);
    }
  }

  function handleCloseConversation() {
    selectedAgents = [];
  }

  function handleOpenTasks(agentId: string) {
    showRightPanel = !showRightPanel;
  }
</script>

<div class="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 flex flex-col overflow-hidden">
  <!-- Top Bar -->
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white mb-1">Agent Workspace</h1>
      <p class="text-gray-400 text-sm font-mono">Multi-agent terminal interface</p>
    </div>
    <div class="flex items-center gap-3">
      <button
        onclick={() => (showSettingsModal = true)}
        class="text-gray-400 hover:text-white transition bg-gray-800 hover:bg-gray-700 p-2 rounded-md border border-gray-700 cursor-pointer"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <button
        onclick={() => (showSpawnModal = true)}
        class="bg-green-600 hover:bg-green-700 text-white font-mono gap-2 flex items-center px-4 py-2 rounded-md transition disabled:opacity-50 cursor-pointer"
        disabled={!selectedWorkspace}
      >
        <span class="text-lg leading-none mb-0.5">+</span>
        spawn agent
      </button>
    </div>
  </div>

  {#if showSettingsModal}
    <SettingsModal onClose={() => (showSettingsModal = false)} />
  {/if}

  {#if showSpawnModal}
    <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
        <h2 class="text-xl font-bold text-white mb-4 font-mono text-green-400">Spawn New Agent</h2>
        
        <div class="space-y-4 font-mono text-sm">
          <div>
            <label class="block text-gray-400 mb-1">Provider Engine</label>
            <select bind:value={spawnProviderId} class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500">
              <option value="openai">OpenAI (or Compatible JSON REST)</option>
              <option value="mock">Offline Mock Engine</option>
            </select>
          </div>

          <div>
            <label class="block text-gray-400 mb-1">Target Sub-directory <span class="text-gray-600 text-xs">(optional)</span></label>
            <input type="text" bind:value={spawnRelativeDirectory} placeholder="e.g. apps/desktop" class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500 placeholder:text-gray-600" />
          </div>

          <div>
            <label class="block text-gray-400 mb-1">
               Model Name 
               {#if isLoadingModels}
                 <span class="text-xs text-yellow-500 animate-pulse ml-2">fetching models...</span>
               {/if}
            </label>
            <select bind:value={spawnModel} class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500">
               {#each availableModels as model}
                 <option value={model.id}>{model.id}</option>
               {/each}
            </select>
          </div>

          {#if spawnProviderId === 'openai'}
             <div class="mt-4 p-3 bg-gray-800/50 border border-gray-700 rounded-md">
                <span class="block text-xs text-green-400 mb-2 uppercase tracking-wide font-semibold">Connection Settings</span>
                {#if resolvedBaseUrl || resolvedApiKey}
                   <p class="text-xs text-gray-400">Using credentials from Global Settings.</p>
                   {#if resolvedBaseUrl}
                      <p class="text-xs text-gray-500 truncate mt-1">URL: {resolvedBaseUrl}</p>
                   {/if}
                {:else}
                   <div class="space-y-3">
                     <div>
                       <label class="block text-gray-400 mb-1 text-xs">Base URL</label>
                       <input type="text" bind:value={spawnBaseURL} placeholder="http://127.0.0.1:8080/v1" class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white outline-none focus:border-green-500 placeholder:text-gray-600 text-xs" />
                     </div>
                     <div>
                       <label class="block text-gray-400 mb-1 text-xs">API Key</label>
                       <input type="password" bind:value={spawnApiKey} placeholder="sk-..." class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white outline-none focus:border-green-500 placeholder:text-gray-600 text-xs" />
                     </div>
                   </div>
                {/if}
             </div>
          {/if}
        </div>

        <div class="mt-8 flex justify-end gap-3">
          <button onclick={() => (showSpawnModal = false)} class="px-4 py-2 text-gray-400 hover:text-white font-mono cursor-pointer">cancel</button>
          <button onclick={handleSpawnAgent} class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-mono cursor-pointer">initialize</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Terminal Modals Grid -->
  <div class="flex-1 overflow-auto">
    {#if selectedAgents.length === 0}
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="text-6xl mb-4">💻</div>
          <h2 class="text-xl font-semibold text-gray-300 mb-2">
            No active agents
          </h2>
          <p class="text-gray-500 font-mono text-sm">
            Click "spawn agent" to start
          </p>
        </div>
      </div>
    {:else}
      <div
        class="grid gap-6 h-full"
        style="grid-template-columns: {selectedAgents.length === 1 ? '1fr' : selectedAgents.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'}; grid-auto-rows: minmax(500px, 1fr);"
      >
        {#each selectedAgents as agentId (agentId)}
          {@const agent = workspaces.find(w => w.id === selectedWorkspace)?.agents.find(a => a.id === agentId)}
          {#if agent}
            <AgentTerminalModal
              agent={agent}
              messages={messages.filter(m => m.agentId === agentId)}
              tasks={tasks.filter(t => t.agentId === agentId)}
              artifacts={artifacts.filter(a => a.agentId === agentId)}
              onClose={() => handleAgentSelect(agentId)}
              onSendMessage={(msg) => handleSendMessageToAgent(agentId, msg)}
            />
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>
