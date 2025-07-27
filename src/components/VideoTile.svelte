<script lang="ts">
  import IconMicOff from '~icons/tabler/microphone-off';
  import IconVideoOff from '~icons/tabler/video-off';
  export let isLocal: boolean;
  export let name: string;
  export let videoOn: boolean;
  export let stream: MediaStream | null = null;
  export let isSpeaking: boolean = false;
  export let initials: string;
  export let onClick: (() => void) | null = null;
  export let audioOn: boolean = true;
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

<button type="button" class="relative aspect-video min-w-0 min-h-0 bg-black rounded-lg md:rounded-2xl shadow-lg flex items-center justify-center overflow-hidden transition-all duration-300 w-full h-full" on:click={onClick}>
  {#if isSpeaking}
    <div class="absolute inset-0 z-10 pointer-events-none rounded-lg md:rounded-2xl border-2 md:border-4 border-indigo-400 animate-glow-outline"></div>
  {/if}
  {#if videoOn && stream}
    <video bind:this={videoEl} autoplay playsinline muted={isLocal} class="w-full h-full object-cover rounded-lg md:rounded-2xl transition-all duration-300" use:setSrcObject={stream}></video>
  {:else}
          <div class="flex flex-col items-center justify-center w-full h-full">
        <div class="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-indigo-400 flex items-center justify-center text-white text-lg md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">{initials}</div>
        <span class="text-white text-xs md:text-sm">Camera Off</span>
      </div>
  {/if}
  <span class="absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-xs px-2 md:px-3 py-1 rounded-full text-white shadow max-w-[85%] truncate">{name}{isLocal ? ' (You)' : ''}</span>
  <slot />
  {#if !isLocal && !audioOn}
    <span class="absolute top-1 md:top-2 right-1 md:right-2 z-30">
      <span class="bg-black/60 rounded-full p-1 md:p-2 flex items-center justify-center">
        <IconMicOff size="14" class="md:w-4 md:h-4 text-red-500" />
      </span>
    </span>
  {/if}
  {#if !isLocal && !videoOn}
    <span class="absolute top-1 md:top-2 left-1 md:left-2 z-30">
      <span class="bg-black/60 rounded-full p-1 md:p-2 flex items-center justify-center">
        <IconVideoOff size="14" class="md:w-4 md:h-4 text-red-500" />
      </span>
    </span>
  {/if}
</button> 