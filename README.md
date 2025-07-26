# Meet: Video Meeting Web App

A modern, full-stack video meeting application built with Astro, Svelte, Bun, and a TypeScript backend. Features real-time video/audio, chat, TURN server support, and Discord notifications.

## Features
- Real-time video and audio meetings (WebRTC)
- Chat during meetings
- Meeting scheduling and persistent storage (SQLite)
- TURN server support for NAT traversal (dynamic credentials)
- Discord notifications when meetings are created
- Clean, responsive UI with Svelte and Tailwind CSS
- Single-process deployment (Astro API + WebSocket signaling + static serving)

## Tech Stack
- **Frontend:** Astro, Svelte, Tailwind CSS
- **Backend:** Astro API routes (TypeScript), SQLite (better-sqlite3)
- **WebRTC Signaling:** Astro API route with native WebSocket (astro-bun-websocket)
- **TURN Server:** coturn (dynamic credentials via REST API)
- **Notifications:** Discord Webhook
- **Runtime:** Bun

## Setup

1. **Clone the repo:**
   ```sh
   git clone <repo-url>
   cd meet
   ```

2. **Install dependencies:**
   ```sh
   bun install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   # TURN server (coturn) dynamic auth
   TURN_SECRET=your_shared_secret
   PUBLIC_TURN_URLS=turn:yourdomain.com:3478
   TURN_REALM=yourdomain.com

   # Discord webhook for notifications
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token

   # (Optional) Public backend URL for client
   PUBLIC_BACKEND_URL=https://yourdomain.com
   ```

4. **Configure coturn:**
   - Set up coturn on your server with `lt-cred-mech`, `use-auth-secret`, and `static-auth-secret` matching your `TURN_SECRET`.
   - Open UDP/TCP ports as needed.

5. **Run the app:**
   ```sh
   bun run dev
   # or for production
   bun run build && bun run start
   ```

## Usage
- Visit `/` to schedule or join a meeting.
- Share the meeting link with others.
- When a meeting is created, a Discord notification is sent.
- TURN credentials are provided dynamically to clients for reliable connectivity.

## Deployment Notes
- Designed for single-process deployment (Astro API, static, and signaling in one Bun process).
- For best reliability, deploy behind a reverse proxy (e.g., nginx) and ensure coturn is reachable from clients.
- SQLite is used for persistence; for high scale, consider a managed DB.

## License
MIT 