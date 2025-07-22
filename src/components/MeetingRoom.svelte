<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { MeetingRTC } from '../lib/webrtc';
  export let meetingId: string;
  let joined = false;
  let displayName = '';
  let joinError = '';

  // UI state
  let localVideo: HTMLVideoElement | null = null;
  let localStream: MediaStream | null = null;
  let audioEnabled = true;
  let videoEnabled = true;
  let remoteStreams: { peerId: string; stream: MediaStream; name: string }[] = [];
  let chatInput = '';
  let chatMessages: { sender: string; text: string; time: string }[] = [];
  let chatArea: HTMLDivElement | null = null;
  let rtc: MeetingRTC | null = null;

  // Svelte action to set srcObject for remote video
  function setSrcObject(node: HTMLVideoElement, stream: MediaStream) {
    node.srcObject = stream;
    return {
      update(newStream: MediaStream) {
        node.srcObject = newStream;
      }
    };
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
        // Only add if not already present
        if (!remoteStreams.find(r => r.peerId === peerId)) {
          remoteStreams = [...remoteStreams, { peerId, stream, name }];
        }
      },
      onChatMessage: (msg) => {
        chatMessages = [...chatMessages, msg];
        tick().then(() => {
          if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        });
      },
      onPeerJoin: (peerId, name) => {
        // Optionally show a notification or update UI
      },
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
</script>

{#if !joined}
  <form class="w-full max-w-sm bg-gray-100 rounded-lg p-6 flex flex-col gap-4 items-center" on:submit|preventDefault={handleJoin}>
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
{:else}
  <div class="w-full flex flex-col md:flex-row gap-6">
    <div class="flex-1 flex flex-col items-center">
      <div class="w-full aspect-video bg-black rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
        <video bind:this={localVideo} autoplay playsinline muted class="w-full h-full object-cover rounded-lg" />
        {#if !videoEnabled}
          <span class="absolute text-white text-lg">Camera Off</span>
        {/if}
      </div>
      {#each remoteStreams as remote}
        <div class="w-full aspect-video bg-black rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
          <video autoplay playsinline class="w-full h-full object-cover rounded-lg" use:setSrcObject={remote.stream} />
          <span class="absolute left-2 top-2 bg-white/80 text-xs px-2 py-1 rounded">{remote.name || remote.peerId}</span>
        </div>
      {/each}
      <div class="flex gap-4 mb-4">
        <button class="btn btn-secondary" type="button" on:click={toggleAudio}>
          {audioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button class="btn btn-secondary" type="button" on:click={toggleVideo}>
          {videoEnabled ? 'Disable Camera' : 'Enable Camera'}
        </button>
      </div>
    </div>
    <div class="flex-1 flex flex-col">
      <div class="flex-1 bg-gray-50 rounded-lg p-4 mb-2 overflow-y-auto min-h-[200px]" bind:this={chatArea}>
        {#if chatMessages.length === 0}
          <div class="text-gray-400 text-center">Chat will appear here</div>
        {:else}
          <ul class="space-y-2">
            {#each chatMessages as msg}
              <li class="flex flex-col">
                <span class="text-xs text-gray-500">{msg.sender} <span class="ml-2">{msg.time}</span></span>
                <span class="bg-white rounded px-2 py-1 shadow text-gray-800">{msg.text}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
      <form class="flex gap-2" on:submit={sendMessage} autocomplete="off">
        <input class="input input-bordered flex-1" placeholder="Type a message..." bind:value={chatInput} />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
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
</style> 