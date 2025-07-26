<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { MeetingRTC } from '../lib/webrtc';
  import IconMessage from '~icons/tabler/message';
  import IconMessageOff from '~icons/tabler/message-off';
  import IconCopy from '~icons/tabler/copy';
  import IconX from '~icons/tabler/x';
  import MeetingControls from './MeetingControls.svelte';
  import VideoTile from './VideoTile.svelte';
  export let meetingId: string;
  let joined = false;
  let displayName = '';
  let joinError = '';

  // UI state
  let localVideo: HTMLVideoElement | null = null;
  let localStream: MediaStream | null = null;
  let audioEnabled = true;
  let videoEnabled = true;
  let remoteStreams: { peerId: string; stream: MediaStream | null; name: string; videoOn?: boolean; audioOn?: boolean }[] = [];
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
          localVideo.play().catch(() => {});
        }
      });
      // When screen sharing ends, revert to camera
      screenTrack.onended = stopScreenShare;
    } catch (err) {
      // User cancelled or error
    }
  }

  function stopScreenShare() {
    if (!rtc || !originalVideoTrack) return;
    if (!localStream) return;
    // Remove screen track
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach(track => localStream!.removeTrack(track));
    }
    if (localStream) {
      localStream.addTrack(originalVideoTrack);
    }
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
        localVideo.srcObject = localStream;
        localVideo.play().catch(() => {});
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
        console.info('[MeetingRoom] onPeerVideo', peerId, name, stream);
        if (!remoteStreams.find(r => r.peerId === peerId)) {
          remoteStreams = [...remoteStreams, { peerId, stream, name, videoOn: true, audioOn: true }];
        }
      },
      onChatMessage: (msg) => {
        chatMessages = [...chatMessages, msg];
        tick().then(() => {
          if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        });
      },
      onPeerLeave: (peerId) => {
        remoteStreams = remoteStreams.filter(r => r.peerId !== peerId);
      },
      onPeerMute: (peerId, muted) => {
        remoteStreams = remoteStreams.map(r =>
          r.peerId === peerId ? { ...r, audioOn: !muted } : r
        );
      },
      onPeerVideoToggle: (peerId, videoOn) => {
        remoteStreams = remoteStreams.map(r =>
          r.peerId === peerId ? { ...r, videoOn } : r
        );
      },
    });
    console.info('[MeetingRoom] Calling rtc.join()...');
    rtc.join().then(() => {
      localStream = rtc?.getLocalStream() || null;
      console.info('[MeetingRoom] rtc.join() resolved, localStream:', localStream);
      tick().then(() => {
        if (localVideo && localStream) {
          localVideo.srcObject = localStream;
          localVideo.play().catch(() => {});
          console.debug('[MeetingRoom] localVideo element set with localStream:', localVideo, localStream);
        } else {
          console.warn('[MeetingRoom] localVideo or localStream missing after join', localVideo, localStream);
        }
      });
    }).catch(err => {
      joinError = 'Could not access camera or microphone.';
      console.error('[MeetingRoom] rtc.join() error:', err);
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
        // Broadcast mute/unmute to all peers
        rtc.sendMuteSignal(!audioEnabled);
      }
    }
  }

  function toggleVideo() {
    if (rtc) {
      rtc.toggleVideo();
      if (localStream) {
        videoEnabled = localStream.getVideoTracks().some(track => track.enabled);
        // Broadcast video on/off to all peers
        rtc.sendVideoSignal(videoEnabled);
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
    (localVideo as HTMLVideoElement).srcObject = localStream;
    (localVideo as HTMLVideoElement).play().catch(() => {});
    console.log('[MeetingRoom] $: localVideo and localStream set', localVideo, localStream);
  }

  $: participants = [
    { name: displayName, isLocal: true, videoOn: videoEnabled },
    ...remoteStreams.map(r => ({ name: r.name, isLocal: false, videoOn: r.videoOn !== false }))
  ];

  // Audio activity detection for local stream
  function monitorLocalAudio() {
    if (!localStream) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
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
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
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
    remoteStreams.forEach(r => {
      if (r.stream) monitorRemoteAudio(r.peerId, r.stream);
    });
  }
</script>

{#if !joined}
  <div class="fixed inset-0 flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-white">
    <form class="w-full max-w-md bg-white/90 rounded-2xl p-8 flex flex-col gap-6 items-center shadow-2xl border border-indigo-100 backdrop-blur-md" on:submit|preventDefault={handleJoin}>
      <h2 class="text-2xl font-extrabold mb-2 text-center text-indigo-700 tracking-tight">Join Meeting</h2>
      <input
        class="w-full border border-indigo-200 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition placeholder-gray-400 bg-indigo-50/60"
        placeholder="Your name"
        bind:value={displayName}
        required
        aria-label="Display name"
        autocomplete="name"
      />
      {#if joinError}
        <div class="text-red-500 text-sm w-full text-center">{joinError}</div>
      {/if}
      <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2" type="submit">Join Meeting</button>
    </form>
  </div>
{:else}
  <div class="fixed inset-0 min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
    <!-- Mobile Header -->
    <header class="flex md:hidden items-center justify-between px-2 py-2 bg-white/90 shadow-sm sticky top-0 z-30">
      <span class="font-mono text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">ID: {meetingId.slice(0, 4)}...</span>
      <button class="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs" on:click={copyMeetingLink} aria-label="Copy meeting link">
        <IconCopy size="18" />
        {#if copied}
          <span>Copied!</span>
        {:else}
          <span>Copy</span>
        {/if}
      </button>
      <button class="btn btn-secondary flex items-center gap-2 md:hidden" type="button" on:click={toggleChat} aria-label={showChat ? 'Hide Chat' : 'Show Chat'}>
        {#if showChat}
          <IconMessageOff size="22" />
        {:else}
          <IconMessage size="22" />
        {/if}
      </button>
    </header>
    <!-- Desktop Header -->
    <header class="hidden md:flex items-center justify-between px-4 py-3 bg-white/80 shadow-sm sticky top-0 z-30">
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
    <div class="flex-1 flex flex-col md:flex-row gap-0 md:gap-6 max-w-7xl w-full mx-auto px-0 md:px-8 py-2 md:py-4 h-full">
      <!-- Video grid -->
      <div class="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <div class="flex-1 grid gap-2 md:gap-4 w-full h-full overflow-x-auto md:overflow-visible pb-28 md:pb-0"
          style="grid-template-columns: repeat(auto-fit, minmax(min(320px,100%), 1fr)); grid-auto-rows: 0;">
          {#if focusedTile === null}
            <VideoTile
              isLocal={true}
              name={displayName}
              videoOn={videoEnabled}
              stream={localStream}
              isSpeaking={localSpeaking}
              initials={getInitials(displayName)}
              onClick={() => focusedTile = { type: 'local' }}
            />
            <!-- Remote video tiles -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            {#each remoteStreams as remote}
              <VideoTile
                isLocal={false}
                name={remote.name}
                videoOn={remote.videoOn !== false}
                audioOn={remote.audioOn !== false}
                stream={remote.stream}
                isSpeaking={speakingPeers.has(remote.peerId)}
                initials={getInitials(remote.name)}
                onClick={() => focusedTile = { type: 'remote', peerId: remote.peerId }}
              />
            {/each}
          {:else}
            <!-- Focused tile -->
            {#if focusedTile.type === 'local'}
              <VideoTile
                isLocal={true}
                name={displayName}
                videoOn={videoEnabled}
                stream={localStream}
                isSpeaking={localSpeaking}
                initials={getInitials(displayName)}
              >
                <button class="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-white" on:click={() => focusedTile = null} aria-label="Exit focus"><IconX size="22" /></button>
              </VideoTile>
            {:else}
              {#each remoteStreams as remote}
                {#if remote.peerId === focusedTile.peerId}
                  <VideoTile
                    isLocal={false}
                    name={remote.name}
                    videoOn={remote.videoOn !== false}
                    stream={remote.stream}
                    isSpeaking={speakingPeers.has(remote.peerId)}
                    initials={getInitials(remote.name)}
                  >
                    <button class="absolute top-2 right-2 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-white" on:click={() => focusedTile = null} aria-label="Exit focus"><IconX size="22" /></button>
                  </VideoTile>
                {/if}
              {/each}
            {/if}
          {/if}
        </div>
        <MeetingControls
          {audioEnabled}
          {videoEnabled}
          {isScreenSharing}
          {showChat}
          {toggleAudio}
          {toggleVideo}
          {startScreenShare}
          {stopScreenShare}
          {toggleChat}
          {leaveMeeting}
        />
      </div>
      <!-- Chat sidebar (conditionally rendered) -->
      {#if showChat}
        <aside class="fixed md:static bottom-0 left-0 right-0 md:shrink-0 w-full md:w-[350px] max-w-full flex flex-col bg-white/95 md:bg-white/80 rounded-none md:rounded-2xl shadow-t md:shadow-lg ml-0 md:ml-6 mt-0 md:mt-0 z-50 h-[40vh] md:h-auto" style="max-height:60vh;">
          <div class="flex-1 rounded-none md:rounded-2xl p-2 md:p-4 mb-2 overflow-y-auto min-h-[120px] md:min-h-[200px]" bind:this={chatArea}>
            {#if chatMessages.length === 0}
              <div class="text-gray-400 text-center">Chat will appear here</div>
            {:else}
              <ul class="space-y-2">
                {#each chatMessages as msg}
                  <li class="flex flex-col items-start" class:items-end={msg.sender === displayName}>
                    <span class="text-xs text-gray-500">
                      {msg.sender === displayName ? 'You' : msg.sender}
                      <span class="ml-2">{msg.time}</span>1
                    </span>
                    <span class="bg-white rounded px-2 py-1 shadow text-gray-800 mt-1 {msg.sender === displayName ? 'bg-indigo-100' : ''}">{msg.text}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <form class="flex gap-2 p-2 md:p-4 pt-0" on:submit={sendMessage} autocomplete="off">
            <input class="input input-bordered flex-1" placeholder="Type a message..." bind:value={chatInput} />
            <button class="btn btn-primary" type="submit">Send</button>
          </form>
        </aside>
      {/if}
    </div>
  </div>
{/if}

<style>
</style> 