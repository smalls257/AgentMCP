<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  import type { Writable } from 'svelte/store';

  let {
    className = "",
    value,
    children
  }: {
    className?: string;
    value: string;
    children: Snippet;
  } = $props();

  const store = getContext<Writable<string>>('tabs-context');
</script>

{#if $store === value}
  <div
    data-slot="tabs-content"
    data-state="active"
    class="flex-1 outline-none {className}"
  >
    {@render children()}
  </div>
{/if}
