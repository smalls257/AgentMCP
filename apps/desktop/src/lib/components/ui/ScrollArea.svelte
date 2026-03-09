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

<!-- Simplified natively scrolled ScrollArea to avoid radix library translation -->
<div class="relative overflow-hidden {className}">
  <div class="h-full w-full overflow-y-auto rounded-[inherit] outline-none">
    {@render children()}
  </div>
</div>
