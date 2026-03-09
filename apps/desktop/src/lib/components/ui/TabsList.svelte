<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    className = "",
    children
  }: {
    className?: string;
    children: Snippet;
  } = $props();
</script>

<div 
  data-slot="tabs-list"
  class="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] {className}"
>
  {@render children()}
</div>
