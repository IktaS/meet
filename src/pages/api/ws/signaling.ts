import type { APIRoute } from 'astro';

// In-memory signaling state
const rooms = new Map<string, Map<string, { socket: WebSocket, name: string }>>(); // roomId -> (peerId -> { socket, name })
let peerCounter = 1;
function generatePeerId() {
  return 'peer-' + (peerCounter++);
}

function broadcast(roomId: string, senderId: string, data: any) {
  const peers = rooms.get(roomId);
  if (!peers) return;
  for (const [peerId, peer] of peers) {
    if (peerId !== senderId && peer.socket.readyState === peer.socket.OPEN) {
      peer.socket.send(JSON.stringify(data));
    }
  }
}

export const GET: APIRoute = ctx => {
  console.info('[Signaling] GET request received for WebSocket upgrade');
  console.info('[Signaling] Request headers:', Object.fromEntries(ctx.request.headers.entries()));
  console.info('[Signaling] Request URL:', ctx.request.url);
  if (!ctx.locals.isUpgradeRequest) {
    console.warn('[Signaling] Not an upgrade request, returning 426');
    return new Response('Upgrade required', { status: 426 });
  }
  console.info('[Signaling] Processing WebSocket upgrade');
  const { response, socket } = ctx.locals.upgradeWebSocket();
  let roomId = '';
  let peerId = '';

  socket.onmessage = event => {
    console.log('[Signaling] Received message:', event.data);
    try {
      const msg = JSON.parse(event.data);
      console.info('[Signaling] Parsed message type:', msg.type);
      if (msg.type === 'join') {
        roomId = msg.roomId;
        peerId = generatePeerId();
        console.info('[Signaling] Peer joining room:', roomId, 'with ID:', peerId);
        if (!rooms.has(roomId)) rooms.set(roomId, new Map());
        rooms.get(roomId)!.set(peerId, { socket, name: msg.name });
        console.log(`[Signaling] Peer joined: ${peerId} in room ${roomId}`);
        console.log('[Signaling] Current peers in room:', Array.from(rooms.get(roomId)!.keys()));
        // Log all peer WebSocket readyStates
        for (const [id, peer] of rooms.get(roomId)!) {
          console.log(`[Signaling] Peer ${id} WebSocket readyState:`, peer.socket.readyState);
        }
        // Send the new client their ID
        socket.send(JSON.stringify({ type: 'id', id: peerId }));
        // Notify others
        broadcast(roomId, peerId, { type: 'new-peer', peerId, name: msg.name });
        // Send list of existing peers to the new peer
        const others = Array.from(rooms.get(roomId)!.entries())
          .filter(([id]) => id !== peerId)
          .map(([id, peer]) => ({ peerId: id, name: peer.name }));
        socket.send(JSON.stringify({ type: 'peers', peers: others }));
      } else if (["offer","answer","ice","chat","peer-name","mute"].includes(msg.type)) {
        const peers = rooms.get(roomId);
        const target = msg.to;
        if (peers && peers.has(target)) {
          console.log(`[Signaling] Forwarding ${msg.type} from ${peerId} to ${target}`);
          console.log('[Signaling] All peers in room:', Array.from(peers.keys()));
          for (const [id, peer] of peers) {
            console.log(`[Signaling] Peer ${id} WebSocket readyState:`, peer.socket.readyState);
          }
          peers.get(target)!.socket.send(JSON.stringify({ ...msg, from: peerId }));
        } else if (msg.type === 'mute' || msg.type === 'video') {
          // Broadcast mute/video to all peers
          broadcast(roomId, peerId, { ...msg, from: peerId });
        } else {
          console.warn(`[Signaling] No peer found for target ${target} in room ${roomId}`);
        }
      } else if (msg.type === 'leave') {
        socket.close();
      }
    } catch (e) {
      console.error('[Signaling] Error parsing message:', e);
    }
  };
  socket.onopen = () => {
    console.info('[Signaling] WebSocket connection opened');
  };
  socket.onclose = () => {
    console.info('[Signaling] WebSocket connection closed');
    if (roomId && peerId && rooms.has(roomId)) {
      rooms.get(roomId)!.delete(peerId);
      broadcast(roomId, peerId, { type: 'peer-left', peerId });
      if (rooms.get(roomId)!.size === 0) rooms.delete(roomId);
      console.log(`[Signaling] Peer left: ${peerId} in room ${roomId}`);
      if (rooms.has(roomId)) {
        console.log('[Signaling] Remaining peers in room:', Array.from(rooms.get(roomId)!.keys()));
      } else {
        console.log('[Signaling] Room deleted:', roomId);
      }
    }
  };
  socket.onerror = (error) => {
    console.error('[Signaling] WebSocket error:', error);
  };
  return response;
}; 