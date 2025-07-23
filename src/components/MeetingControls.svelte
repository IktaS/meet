<script lang="ts">
  export let audioEnabled: boolean;
  export let videoEnabled: boolean;
  export let isScreenSharing: boolean;
  export let showChat: boolean;
  export let toggleAudio: () => void;
  export let toggleVideo: () => void;
  export let startScreenShare: () => void;
  export let stopScreenShare: () => void;
  export let toggleChat: () => void;
  export let leaveMeeting: () => void;
  import IconMic from '~icons/tabler/microphone';
  import IconMicOff from '~icons/tabler/microphone-off';
  import IconVideo from '~icons/tabler/video';
  import IconVideoOff from '~icons/tabler/video-off';
  import IconMessage from '~icons/tabler/message';
  import IconMessageOff from '~icons/tabler/message-off';
  import IconLogout from '~icons/tabler/logout';
  import IconScreenShare from '~icons/tabler/screen-share';
  import IconScreenShareOff from '~icons/tabler/screen-share-off';
</script>

<div class="fixed md:absolute left-0 right-0 bottom-0 md:left-1/2 md:bottom-6 md:-translate-x-1/2 z-40 flex flex-row md:flex-row gap-2 md:gap-4 bg-white/95 md:bg-white/90 rounded-none md:rounded-full shadow-t md:shadow-lg px-2 md:px-6 py-2 md:py-3 items-center justify-center w-full md:w-auto">
  <button class="btn btn-secondary flex items-center gap-2" type="button" on:click={toggleAudio} aria-label={audioEnabled ? 'Mute' : 'Unmute'}>
    {#if audioEnabled}
      <IconMic size="22" />
    {:else}
      <IconMicOff size="22" />
    {/if}
  </button>
  <button class="btn btn-secondary flex items-center gap-2" type="button" on:click={toggleVideo} aria-label={videoEnabled ? 'Disable Camera' : 'Enable Camera'}>
    {#if videoEnabled}
      <IconVideo size="22" />
    {:else}
      <IconVideoOff size="22" />
    {/if}
  </button>
  <button class="btn btn-secondary flex items-center gap-2" type="button" on:click={isScreenSharing ? stopScreenShare : startScreenShare} aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}>
    {#if isScreenSharing}
      <IconScreenShareOff size="22" />
    {:else}
      <IconScreenShare size="22" />
    {/if}
  </button>
  <button class="btn btn-secondary flex items-center gap-2 hidden md:flex" type="button" on:click={toggleChat} aria-label={showChat ? 'Hide Chat' : 'Show Chat'}>
    {#if showChat}
      <IconMessageOff size="22" />
    {:else}
      <IconMessage size="22" />
    {/if}
  </button>
  <button class="btn btn-danger flex items-center gap-2" type="button" on:click={leaveMeeting} aria-label="Leave Meeting">
    <IconLogout size="22" />
  </button>
</div> 