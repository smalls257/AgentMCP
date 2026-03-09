<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  let { onClose } = $props<{ onClose: () => void }>();

  let openaiBaseUrl = $state('');
  let openaiApiKey = $state('');
  let isSaving = $state(false);
  let saveMessage = $state('');

  onMount(async () => {
    try {
      const savedUrl = await invoke<string | null>('get_setting', { key: 'openai_base_url' });
      if (savedUrl) openaiBaseUrl = savedUrl;

      const savedKey = await invoke<string | null>('get_setting', { key: 'openai_api_key' });
      if (savedKey) openaiApiKey = savedKey;
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  });

  async function handleSave() {
    isSaving = true;
    saveMessage = '';
    try {
      await invoke('set_setting', { key: 'openai_base_url', value: openaiBaseUrl.trim() });
      await invoke('set_setting', { key: 'openai_api_key', value: openaiApiKey.trim() });
      
      saveMessage = 'Settings saved successfully.';
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      saveMessage = 'Failed to save settings.';
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div class="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-2xl">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-white font-mono flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        Global Settings
      </h2>
      <button onclick={onClose} class="text-gray-500 hover:text-white transition-colors cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    
    <div class="space-y-5 font-mono text-sm">
      <!-- OpenAI Compatible Settings -->
      <div class="p-4 border border-gray-800 rounded-md bg-gray-800/50">
        <h3 class="text-green-400 font-semibold mb-3 border-b border-gray-700 pb-2">OpenAI / Local API Provider</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-gray-400 mb-1">Base URL</label>
            <input 
              type="text" 
              bind:value={openaiBaseUrl} 
              placeholder="https://api.openai.com/v1" 
              class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500 placeholder:text-gray-600" 
            />
            <p class="text-xs text-gray-500 mt-1">Leave blank for default OpenAI, or override for local llama.cpp / vLLM.</p>
          </div>

          <div>
            <label class="block text-gray-400 mb-1">API Key</label>
            <input 
              type="password" 
              bind:value={openaiApiKey} 
              placeholder="sk-..." 
              class="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white outline-none focus:border-green-500 placeholder:text-gray-600" 
            />
            <p class="text-xs text-gray-500 mt-1">Your OpenAI or OpenRouter API key. Not required for local APIs.</p>
          </div>
        </div>
      </div>
    </div>

    {#if saveMessage}
      <p class="mt-4 text-sm font-mono text-green-400">{saveMessage}</p>
    {/if}

    <div class="mt-6 flex justify-end gap-3">
      <button onclick={onClose} class="px-4 py-2 text-gray-400 hover:text-white font-mono transition-colors cursor-pointer">
        close
      </button>
      <button 
        onclick={handleSave} 
        disabled={isSaving}
        class="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-mono transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
      >
        {isSaving ? 'saving...' : 'save'}
      </button>
    </div>
  </div>
</div>
