<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { MeetingRTC } from '../lib/webrtc';
  import IconMic from '~icons/tabler/microphone';
  import IconMicOff from '~icons/tabler/microphone-off';
  import IconVideo from '~icons/tabler/video';
  import IconVideoOff from '~icons/tabler/video-off';
  import IconMessage from '~icons/tabler/message';
  import IconMessageOff from '~icons/tabler/message-off';
  import IconLogout from '~icons/tabler/logout';
  import IconCopy from '~icons/tabler/copy';
  export let meetingId: string;
  let joined = false;
  let displayName = '';
  let joinError = '';

  // UI state
  let localVideo: HTMLVideoElement | null = null;
  let localStream: MediaStream | null = null;
  let audioEnabled = true;
  let videoEnabled = true;
  let remoteStreams: { peerId: string; stream: MediaStream; name: string; videoOn?: boolean }[] = [];
  let chatInput = '';
  let chatMessages: { sender: string; text: string; time: string }[] = [];
  let chatArea: HTMLDivElement | null = null;
  let rtc: MeetingRTC | null = null;
  let showChat = false; // chat closed by default
  let copied = false;

  // Svelte action to set srcObject for remote video
  function setSrcObject(node: HTMLVideoElement, stream: MediaStream) {
    node.srcObject = stream;
    return {
      update(newStream: MediaStream) {
        node.srcObject = newStream;
      }
    };
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function copyMeetingLink() {
    navigator.clipboard.writeText(window.location.href);
    copied = true;
    setTimeout(() => copied = false, 1500);
  }

  function handleJoin(e: Event) {
    e.preventDefault();
    if (!displayName.trim()) {
      joinError = 'Please enter your name';
      return;
    }
    joinError = '';
    joined = true;
    remoteStreams = [];
    chatMessages = [];
    rtc = new MeetingRTC({
      meetingId,
      displayName,
      onPeerVideo: (peerId, stream, name) => {
        if (!remoteStreams.find(r => r.peerId === peerId)) {
          remoteStreams = [...remoteStreams, { peerId, stream, name, videoOn: true }];
        }
      },
      onChatMessage: (msg) => {
        chatMessages = [...chatMessages, msg];
        tick().then(() => {
          if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        });
      },
      onPeerJoin: (peerId, name) => {},
      onPeerLeave: (peerId) => {
        remoteStreams = remoteStreams.filter(r => r.peerId !== peerId);
      }
    });
    rtc.join().then(() => {
      localStream = rtc?.getLocalStream() || null;
      tick().then(() => {
        if (localVideo && localStream) {
          localVideo.srcObject = localStream;
          localVideo.play();
        }
      });
    }).catch(err => {
      joinError = 'Could not access camera or microphone.';
    });
  }

  function sendMessage(e: Event) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !rtc) return;
    rtc.sendChat(text);
    chatInput = '';
    tick().then(() => {
      if (chatArea) chatArea.focus();
    });
  }

  function toggleAudio() {
    if (rtc) {
      rtc.toggleAudio();
      if (localStream) {
        audioEnabled = localStream.getAudioTracks().some(track => track.enabled);
      }
    }
  }

  function toggleVideo() {
    if (rtc) {
      rtc.toggleVideo();
      if (localStream) {
        videoEnabled = localStream.getVideoTracks().some(track => track.enabled);
      }
    }
  }

  function toggleChat() {
    showChat = !showChat;
    tick().then(() => {
      if (showChat && chatArea) chatArea.focus();
    });
  }

  function leaveMeeting() {
    rtc?.close();
    joined = false;
    remoteStreams = [];
    chatMessages = [];
    localStream = null;
    audioEnabled = true;
    videoEnabled = true;
  }

  // Clean up on destroy
  onMount(() => {
    return () => {
      rtc?.close();
    };
  });

  // Ensure local video preview always updates
  $: if (joined && localVideo && localStream) {
    localVideo.srcObject = localStream;
    localVideo.play();
  }

  $: participants = [
    { name: displayName, isLocal: true, videoOn: videoEnabled },
    ...remoteStreams.map(r => ({ name: r.name, isLocal: false, videoOn: r.videoOn !== false }))
  ];
</script>

{#if !joined}
  <div class="fixed inset-0 flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-white">
    <form class="w-full max-w-sm bg-gray-100 rounded-lg p-6 flex flex-col gap-4 items-center shadow-xl" on:submit|preventDefault={handleJoin}>
      <h2 class="text-xl font-bold mb-2 text-center">Join Meeting</h2>
      <input
        class="input input-bordered w-full"
        placeholder="Your name"
        bind:value={displayName}
        required
        aria-label="Display name"
      />
      {#if joinError}
        <div class="text-red-500 text-sm">{joinError}</div>
      {/if}
      <button class="btn btn-primary w-full" type="submit">Join Meeting</button>
    </form>
  </div>
{:else}
  <div class="fixed inset-0 min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 bg-white/80 shadow-sm sticky top-0 z-30">
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">Meeting ID: {meetingId.slice(0, 8)}...</span>
        <button class="ml-2 btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs" on:click={copyMeetingLink} aria-label="Copy meeting link">
          <IconCopy size="18" />
          {#if copied}
            <span>Copied!</span>
          {:else}
            <span>Copy link</span>
          {/if}
        </button>
      </div>
      <div class="flex items-center gap-2">
        {#each participants as p}
          <div class="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-200 text-indigo-700 font-bold text-xs border-2 border-white shadow" title={p.name}>
            {getInitials(p.name)}
          </div>
        {/each}
        <span class="ml-2 text-xs text-gray-500">{participants.length} joined</span>
      </div>
    </header>
    <!-- Main content -->
    <div class="flex-1 flex flex-row gap-0 md:gap-6 max-w-7xl w-full mx-auto px-0 md:px-8 py-4 h-full">
      <!-- Video grid -->
      <div class="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <div class="flex-1 grid gap-4 w-full h-full"
          style="grid-template-columns: repeat(auto-fit, minmax(min(400px,100%), 1fr)); grid-auto-rows: 0;">
          <!-- Local video tile -->
          <div class="relative aspect-video min-w-0 min-h-0 bg-black rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
            {#if videoEnabled && localStream}
              <video bind:this={localVideo} autoplay playsinline muted class="w-full h-full object-cover rounded-2xl transition-all duration-300" />
            {:else}
              <div class="flex flex-col items-center justify-center w-full h-full">
                <div class="w-20 h-20 rounded-full bg-indigo-400 flex items-center justify-center text-white text-3xl font-bold mb-2">{getInitials(displayName)}</div>
                <span class="text-white text-sm">Camera Off</span>
              </div>
            {/if}
            <span class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-xs px-3 py-1 rounded-full text-white shadow">{displayName} (You)</span>
          </div>
          <!-- Remote video tiles -->
          {#each remoteStreams as remote}
            <div class="relative aspect-video min-w-0 min-h-0 bg-black rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
              {#if remote.videoOn !== false}
                <video autoplay playsinline class="w-full h-full object-cover rounded-2xl transition-all duration-300" use:setSrcObject={remote.stream} />
              {:else}
                <div class="flex flex-col items-center justify-center w-full h-full">
                  <div class="w-20 h-20 rounded-full bg-indigo-300 flex items-center justify-center text-white text-3xl font-bold mb-2">{getInitials(remote.name)}</div>
                  <span class="text-white text-sm">Camera Off</span>
                </div>
              {/if}
              <span class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-xs px-3 py-1 rounded-full text-white shadow">{remote.name}</span>
            </div>
          {/each}
        </div>
        <!-- Controls bar: absolutely positioned at bottom center of grid container -->
        <div class="absolute left-1/2 bottom-6 transform -translate-x-1/2 z-40 flex gap-4 bg-white/90 rounded-full shadow-lg px-6 py-3 items-center">
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
          <button class="btn btn-secondary flex items-center gap-2" type="button" on:click={toggleChat} aria-label={showChat ? 'Hide Chat' : 'Show Chat'}>
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
      </div>
      <!-- Chat sidebar (conditionally rendered) -->
      {#if showChat}
        <aside class="shrink-0 w-[350px] max-w-full flex flex-col bg-white/80 rounded-2xl shadow-lg ml-0 md:ml-6 mt-6 md:mt-0">
          <div class="flex-1 rounded-2xl p-4 mb-2 overflow-y-auto min-h-[200px]" bind:this={chatArea} tabindex="0">
            {#if chatMessages.length === 0}
              <div class="text-gray-400 text-center">Chat will appear here</div>
            {:else}
              <ul class="space-y-2">
                {#each chatMessages as msg}
                  <li class="flex flex-col items-start" class:items-end={msg.sender === displayName}>
                    <span class="text-xs text-gray-500">
                      {msg.sender === displayName ? 'You' : msg.sender}
                      <span class="ml-2">{msg.time}</span>
                    </span>
                    <span class="bg-white rounded px-2 py-1 shadow text-gray-800 mt-1 {msg.sender === displayName ? 'bg-indigo-100' : ''}">{msg.text}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <form class="flex gap-2 p-4 pt-0" on:submit={sendMessage} autocomplete="off">
            <input class="input input-bordered flex-1" placeholder="Type a message..." bind:value={chatInput} />
            <button class="btn btn-primary" type="submit">Send</button>
          </form>
        </aside>
      {/if}
    </div>
  </div>
{/if}

<style>
  .input {
    @apply border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition;
  }
  .btn {
    @apply bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply bg-blue-600;
  }
  .btn-secondary {
    @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
  }
  .btn-danger {
    @apply bg-red-500 text-white hover:bg-red-600;
  }
</style> 