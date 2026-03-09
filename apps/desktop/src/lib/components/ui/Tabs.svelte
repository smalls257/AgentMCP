<script lang="ts">
  import { setContext, type Snippet } from 'svelte';
  import { writable, type Writable } from 'svelte/store';

  let {
    className = "",
    value = "",
    children
  }: {
    className?: string;
    value?: string;
    children: Snippet;
  } = $props();

  const store = writable(value);
  setContext<Writable<string>>('tabs-context', store);

  $effect(() => {
    store.set(value);
  });
</script>

<div class="flex flex-col gap-2 {className}" data-slot="tabs">
  {@render children()}
</div>
