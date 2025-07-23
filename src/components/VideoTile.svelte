<script lang="ts">
  export let isLocal: boolean;
  export let name: string;
  export let videoOn: boolean;
  export let stream: MediaStream | null = null;
  export let isSpeaking: boolean = false;
  export let initials: string;
  export let onClick: (() => void) | null = null;
  let videoEl: HTMLVideoElement | null = null;
  // Svelte action to set srcObject
  function setSrcObject(node: HTMLVideoElement, stream: MediaStream) {
    node.srcObject = stream;
    return {
      update(newStream: MediaStream) {
        node.srcObject = newStream;
      }
    };
  }
  $: if (videoEl && stream && videoOn) {
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});
  }
</script>

<button type="button" class="relative aspect-video min-w-0 min-h-0 bg-black rounded-2xl shadow-lg flex items-center justify-center overflow-hidden transition-all duration-300" on:click={onClick}>
  {#if isSpeaking}
    <div class="absolute inset-0 z-10 pointer-events-none rounded-2xl border-4 border-indigo-400 animate-glow-outline"></div>
  {/if}
  {#if videoOn && stream}
    <video bind:this={videoEl} autoplay playsinline muted={isLocal} class="w-full h-full object-cover rounded-2xl transition-all duration-300" use:setSrcObject={stream}></video>
  {:else}
    <div class="flex flex-col items-center justify-center w-full h-full">
      <div class="w-20 h-20 rounded-full bg-indigo-400 flex items-center justify-center text-white text-3xl font-bold mb-2">{initials}</div>
      <span class="text-white text-sm">Camera Off</span>
    </div>
  {/if}
  <span class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-xs px-3 py-1 rounded-full text-white shadow">{name}{isLocal ? ' (You)' : ''}</span>
  <slot />
</button> 