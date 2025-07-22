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
  import IconScreenShare from '~icons/tabler/screen-share';
  import IconScreenShareOff from '~icons/tabler/screen-share-off';
  import IconX from '~icons/tabler/x';
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
  let showChat = false;
  let copied = false;
  let isScreenSharing = false;
  let originalVideoTrack: MediaStreamTrack | null = null;
  let focusedTile: { type: 'local' | 'remote', peerId?: string } | null = null;
  let speakingPeers = new Set<string>();
  let localSpeaking = false;

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

  async function startScreenShare() {
    if (!rtc || !localStream) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      // Save original camera track
      if (!originalVideoTrack) {
        originalVideoTrack = localStream.getVideoTracks()[0];
      }
      // Replace video track in local stream
      if (localStream.getVideoTracks().length > 0) {
        localStream.removeTrack(localStream.getVideoTracks()[0]);
      }
      localStream.addTrack(screenTrack);
      // Replace video track in all peer connections
      if (rtc['peers']) {
        Object.values(rtc['peers']).forEach((pc: RTCPeerConnection) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
      }
      isScreenSharing = true;
      // Update local video preview
      tick().then(() => {
        if (localVideo && localStream) {
          localVideo.srcObject = localStream!;
          localVideo.play();
        }
      });
      // When screen sharing ends, revert to camera
      screenTrack.onended = stopScreenShare;
    } catch (err) {
      // User cancelled or error
    }
  }

  function stopScreenShare() {
    if (!rtc || !originalVideoTrack || !localStream) return;
    // Remove screen track
    if (localStream.getVideoTracks().length > 0) {
      localStream.getVideoTracks().forEach(track => localStream.removeTrack(track));
    }
    localStream.addTrack(originalVideoTrack);
    // Replace video track in all peer connections
    if (rtc['peers']) {
      Object.values(rtc['peers']).forEach((pc: RTCPeerConnection) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(originalVideoTrack!);
      });
    }
    isScreenSharing = false;
    originalVideoTrack = null;
    tick().then(() => {
      if (localVideo && localStream) {
        localVideo.srcObject = localStream!;
        localVideo.play();
      }
    });
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

  // Audio activity detection for local stream
  function monitorLocalAudio() {
    if (!localStream) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const micSource = audioCtx.createMediaStreamSource(localStream);
    micSource.connect(analyser);
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function check() {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      localSpeaking = avg > 20;
      requestAnimationFrame(check);
    }
    check();
  }

  // Audio activity detection for remote streams
  function monitorRemoteAudio(peerId: string, stream: MediaStream) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    const remoteSource = audioCtx.createMediaStreamSource(stream);
    remoteSource.connect(analyser);
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function check() {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      if (avg > 20) {
        speakingPeers.add(peerId);
      } else {
        speakingPeers.delete(peerId);
      }
      requestAnimationFrame(check);
    }
    check();
  }

  // Start monitoring audio when streams are available
  $: if (joined && localStream) monitorLocalAudio();
  $: if (joined && remoteStreams.length) {
    remoteStreams.forEach(r => monitorRemoteAudio(r.peerId, r.stream));
  }
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
          {#if focusedTile === null}
            <!-- Local video tile -->
            <div class="relative aspect-video min-w-0 min-h-0 bg-black rounded-2xl shadow-lg flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300"
              on:click={() => focusedTile = { type: 'local' }}>
              {#if localSpeaking}
                <div class="absolute inset-0 z-10 pointer-events-none rounded-2xl border-4 border-indigo-400 animate-glow-outline"></div>
              {/if}
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
              <div class="relative aspect-video min-w-0 min-h-0 bg-black rounded-2xl shadow-lg flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-300"
                on:click={() => focusedTile = { type: 'remote', peerId: remote.peerId }}>
                {#if speakingPeers.has(remote.peerId)}
                  <div class="absolute inset-0 z-10 pointer-events-none rounded-2xl border-4 border-indigo-400 animate-glow-outline"></div>
                {/if}
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
          {:else}
            <!-- Focused tile -->
            {#if focusedTile.type === 'local'}
              <div class="relative aspect-video min-w-0 min-h-0 bg-black rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                <button class="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-white" on:click={() => focusedTile = null} aria-label="Exit focus"><IconX size="22" /></button>
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
            {:else}
              {#each remoteStreams as remote}
                {#if remote.peerId === focusedTile.peerId}
                  <div class="relative aspect-video min-w-0 min-h-0 bg-black rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                    <button class="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-white" on:click={() => focusedTile = null} aria-label="Exit focus"><IconX size="22" /></button>
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
                {/if}
              {/each}
            {/if}
          {/if}
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
          <button class="btn btn-secondary flex items-center gap-2" type="button" on:click={isScreenSharing ? stopScreenShare : startScreenShare} aria-label={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}>
            {#if isScreenSharing}
              <IconScreenShareOff size="22" />
            {:else}
              <IconScreenShare size="22" />
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
  .animate-glow {
    outline: 4px solid #818cf8;
    outline-offset: 0px;
    animation: glow-outline-pulse 1s infinite alternate;
  }
  @keyframes glow-outline-pulse {
    0% { outline-width: 4px; outline-offset: 0px; }
    100% { outline-width: 8px; outline-offset: 4px; }
  }
  .animate-glow-outline {
    animation: glow-outline-pulse 1s infinite alternate;
  }
  @keyframes glow-outline-pulse {
    0% { box-shadow: 0 0 0 0 #818cf8, 0 0 16px 4px #818cf8; }
    100% { box-shadow: 0 0 0 8px #818cf8, 0 0 32px 8px #818cf8; }
  }
</style> 