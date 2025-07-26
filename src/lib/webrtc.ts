type ChatMessage = { sender: string; text: string; time: string };

interface MeetingRTCOptions {
  meetingId: string;
  displayName: string;
  onPeerVideo: (peerId: string, stream: MediaStream, displayName: string) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onPeerJoin?: (peerId: string, displayName: string) => void;
  onPeerLeave?: (peerId: string) => void;
  onPeerMute?: (peerId: string, muted: boolean) => void;
  onPeerVideoToggle?: (peerId: string, videoOn: boolean) => void;
}

export class MeetingRTC {
  private meetingId: string;
  private displayName: string;
  private ws: WebSocket | null = null;
  private peers: Record<string, RTCPeerConnection> = {};
  private dataChannels: Record<string, RTCDataChannel> = {};
  private peerNames: Record<string, string> = {};
  private myId: string = '';
  private localStream: MediaStream | null = null;
  private options: MeetingRTCOptions;

  constructor(options: MeetingRTCOptions) {
    this.meetingId = options.meetingId;
    this.displayName = options.displayName;
    this.options = options;
  }

  async join() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.connectSignaling();
  }

  getLocalStream() {
    return this.localStream;
  }

  sendChat(text: string) {
    const msg = {
      sender: this.displayName,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    Object.values(this.dataChannels).forEach(dc => {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify(msg));
      }
    });
    this.options.onChatMessage(msg);
  }

  toggleAudio() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }

  toggleVideo() {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }

  close() {
    if (this.ws) {
      this.sendSignal({ type: 'leave', id: this.myId });
      this.ws.close();
    }
    Object.values(this.peers).forEach(pc => pc.close());
    this.peers = {};
    this.dataChannels = {};
    this.peerNames = {};
    this.myId = '';
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  public sendMuteSignal(muted: boolean) {
    this.sendSignal({ type: 'mute', muted });
  }

  public sendVideoSignal(videoOn: boolean) {
    this.sendSignal({ type: 'video', videoOn });
  }

  // --- Internal methods ---
  private connectSignaling() {
    const wsBase =
      import.meta.env.PUBLIC_BACKEND_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    console.info('[MeetingRTC] Connecting to signaling server...', wsBase.replace(/^http/, 'ws') + '/api/ws/signaling');
    this.ws = new WebSocket(wsBase.replace(/^http/, 'ws') + '/api/ws/signaling');
    this.ws.onopen = () => {
      console.info('[MeetingRTC] WebSocket open');
      this.sendSignal({ type: 'join', roomId: this.meetingId, name: this.displayName });
    };
    this.ws.onmessage = async (event) => {
      console.log('[MeetingRTC] WebSocket message:', event.data);
      const msg = JSON.parse(event.data);
      if (msg.type === 'id') {
        this.myId = msg.id;
      } else if (msg.type === 'peers') {
        // Only the new joiner initiates connections to existing peers
        for (const peer of msg.peers) {
          const peerId = peer.peerId;
          const name = peer.name;
          this.peerNames[peerId] = name;
          if (peerId !== this.myId) {
            console.info('[MeetingRTC] Creating offer for', peerId, 'name:', name);
            try {
              const pc = this.createPeerConnection(peerId, true);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              this.sendSignal({ type: 'offer', to: peerId, offer });
              this.sendSignal({ type: 'peer-name', to: peerId, name: this.displayName });
              console.info('[MeetingRTC] Offer sent to', peerId);
            } catch (err) {
              console.error('[MeetingRTC] Error creating/sending offer for', peerId, err);
            }
          }
        }
      } else if (msg.type === 'new-peer') {
        const peerId = msg.peerId;
        this.peerNames[peerId] = msg.name;
        if (!this.peers[peerId]) {
          console.log('[MeetingRTC] Creating peer connection for new-peer', peerId);
          this.createPeerConnection(peerId, false);
        }
        this.options.onPeerJoin?.(peerId, msg.name);
      } else if (msg.type === 'peer-name') {
        console.log('[MeetingRTC] Received peer-name from', msg.from, 'name:', msg.name);
        this.peerNames[msg.from] = msg.name;
      } else if (msg.type === 'leave') {
        this.options.onPeerLeave?.(msg.id);
      } else if (msg.type === 'peer-left') {
        this.options.onPeerLeave?.(msg.peerId);
      } else if (msg.type === 'offer') {
        console.debug('[MeetingRTC] About to handle offer:', msg);
        this.handleOffer(msg);
      } else if (msg.type === 'answer') {
        this.handleAnswer(msg);
      } else if (msg.type === 'ice') {
        this.handleIce(msg);
      } else if (msg.type === 'mute' && msg.from) {
        this.options.onPeerMute?.(msg.from, msg.muted);
      } else if (msg.type === 'video' && msg.from) {
        this.options.onPeerVideoToggle?.(msg.from, msg.videoOn);
      } else if (msg.type === 'chat') {
        this.options.onChatMessage({ sender: msg.sender, text: msg.text, time: msg.time });
      }
    };
    this.ws.onclose = () => {
      console.info('[MeetingRTC] WebSocket closed');
      this.ws = null;
    };
    this.ws.onerror = (err) => {
      console.error('[MeetingRTC] WebSocket error:', err);
    };
  }

  private sendSignal(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private createPeerConnection(peerId: string, isInitiator: boolean) {
    console.debug('[MeetingRTC] createPeerConnection', peerId, isInitiator);
    const TURN_URLS = import.meta.env.PUBLIC_TURN_URLS?.split(',') || [];
    const TURN_USERNAME = import.meta.env.PUBLIC_TURN_USERNAME;
    const TURN_CREDENTIAL = import.meta.env.PUBLIC_TURN_CREDENTIAL;
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' } as RTCIceServer,
    ];
    if (TURN_URLS.length > 0 && TURN_USERNAME && TURN_CREDENTIAL) {
      iceServers.push({
        urls: TURN_URLS as string[],
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL
      } as RTCIceServer);
    }
    const pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice',
          to: peerId,
          candidate: event.candidate
        });
      }
    };
    pc.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };
    pc.ontrack = (event) => {
      let stream = event.streams[0];
      console.log('[MeetingRTC] ontrack for peer', peerId, stream);
      if (stream) {
        this.options.onPeerVideo(peerId, stream, this.peerNames[peerId] || peerId);
      }
    };
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    if (isInitiator) {
      const dc = pc.createDataChannel('chat');
      this.setupDataChannel(peerId, dc);
    }
    this.peers[peerId] = pc;
    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    this.dataChannels[peerId] = dc;
    dc.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.options.onChatMessage({ sender: msg.sender, text: msg.text, time: msg.time });
    };
  }

  private async handleOffer(msg: any) {
    console.log('[MeetingRTC] handleOffer from', msg.from, msg.offer);
    try {
      const pc = this.createPeerConnection(msg.from, false);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.sendSignal({ type: 'answer', to: msg.from, answer });
      console.log('[MeetingRTC] Answer sent to', msg.from);
    } catch (err) {
      console.error('[MeetingRTC] Error handling offer from', msg.from, err);
    }
  }

  private async handleAnswer(msg: any) {
    console.log('[MeetingRTC] handleAnswer from', msg.from, msg.answer);
    try {
      const pc = this.peers[msg.from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        console.log('[MeetingRTC] Remote description set for answer from', msg.from);
      } else {
        console.warn('[MeetingRTC] No peer connection found for answer from', msg.from);
      }
    } catch (err) {
      console.error('[MeetingRTC] Error handling answer from', msg.from, err);
    }
  }

  private async handleIce(msg: any) {
    try {
      const pc = this.peers[msg.from];
      if (pc && msg.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        console.log('[MeetingRTC] ICE candidate added for', msg.from);
      } else {
        console.warn('[MeetingRTC] No peer connection or candidate for ICE from', msg.from);
      }
    } catch (err) {
      console.error('[MeetingRTC] Error handling ICE from', msg.from, err);
    }
  }
} 