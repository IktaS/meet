package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn   *websocket.Conn
	roomID string
	name   string
	id     string
	send   chan []byte
}

type Room struct {
	clients map[*Client]bool
	lock    sync.Mutex
}

var (
	rooms    = make(map[string]*Room)
	roomsMu  sync.Mutex
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	clientIDMu sync.Mutex
	clientID   int
)

func nextClientID() string {
	clientIDMu.Lock()
	defer clientIDMu.Unlock()
	clientID++
	return "peer-" + string(rune(clientID+64))
}

func SignalingHandler(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	var joinMsg struct {
		Type   string `json:"type"`
		RoomID string `json:"roomId"`
		Name   string `json:"name"`
	}
	_, msg, err := conn.ReadMessage()
	if err != nil {
		log.Println("Failed to read join message:", err)
		conn.Close()
		return
	}
	if err := json.Unmarshal(msg, &joinMsg); err != nil || joinMsg.Type != "join" {
		log.Println("Invalid join message")
		conn.Close()
		return
	}

	client := &Client{
		conn:   conn,
		roomID: joinMsg.RoomID,
		name:   joinMsg.Name,
		id:     nextClientID(),
		send:   make(chan []byte, 256),
	}

	roomsMu.Lock()
	room, ok := rooms[joinMsg.RoomID]
	if !ok {
		room = &Room{clients: make(map[*Client]bool)}
		rooms[joinMsg.RoomID] = room
	}
	roomsMu.Unlock()

	room.lock.Lock()
	room.clients[client] = true
	// Prepare list of existing peers for the new client
	existingPeers := []map[string]string{}
	for c := range room.clients {
		if c != client {
			existingPeers = append(existingPeers, map[string]string{"peerId": c.id, "name": c.name})
		}
	}
	room.lock.Unlock()

	// Send the new client their ID and the list of existing peers
	client.send <- mustMarshal(map[string]interface{}{
		"type": "id",
		"id":   client.id,
	})
	client.send <- mustMarshal(map[string]interface{}{
		"type":  "peers",
		"peers": existingPeers,
	})

	// Notify all existing clients about the new peer
	room.lock.Lock()
	for c := range room.clients {
		if c != client {
			c.send <- mustMarshal(map[string]interface{}{
				"type":   "new-peer",
				"peerId": client.id,
				"name":   client.name,
			})
		}
	}
	room.lock.Unlock()

	go client.writePump()
	client.readPump(room)
}

func mustMarshal(v interface{}) []byte {
	b, _ := json.Marshal(v)
	return b
}

func (c *Client) readPump(room *Room) {
	defer func() {
		room.lock.Lock()
		delete(room.clients, c)
		room.lock.Unlock()
		c.conn.Close()
	}()
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		// Broadcast signaling and chat messages to the correct peer(s)
		var m map[string]interface{}
		if err := json.Unmarshal(msg, &m); err != nil {
			continue
		}
		if to, ok := m["to"].(string); ok {
			// Send to specific peer
			room.lock.Lock()
			for client := range room.clients {
				if client.id == to {
					client.send <- msg
					break
				}
			}
			room.lock.Unlock()
		} else {
			// Broadcast to all (e.g., chat)
			room.lock.Lock()
			for client := range room.clients {
				if client != c {
					client.send <- msg
				}
			}
			room.lock.Unlock()
		}
	}
}

func (c *Client) writePump() {
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
}
