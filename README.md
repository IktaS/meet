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

## Production Deployment

1. **Prepare your server:**
   - Install [Bun](https://bun.sh/), SQLite, and coturn.
   - Ensure ports 80/443 (HTTP/HTTPS) and your TURN ports are open.

2. **Clone and set up the project:**
   ```sh
   git clone <repo-url>
   cd meet
   bun install
   cp .env.example .env # or create your .env as above
   # Edit .env with your production values
   ```

3. **Build the app:**
   ```sh
   bun run build
   ```

4. **Run the app:**
   ```sh
   bun run start
   # Or use a process manager like pm2 or systemd for reliability
   ```

5. **Set up a reverse proxy (recommended):**
   - Use nginx or Caddy to proxy HTTPS traffic to your Bun app (default port 3000 or as set in .env).
   - Example nginx config:
     ```nginx
     server {
         listen 80;
         server_name yourdomain.com;
         location / {
             proxy_pass http://localhost:3000;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
             proxy_set_header X-Forwarded-Proto $scheme;
         }
     }
     ```
   - Set up SSL (Let's Encrypt) for HTTPS.

6. **Coturn:**
   - Ensure coturn is running and accessible on the public TURN port(s).
   - Use the same TURN_SECRET as in your .env.
   - Open UDP/TCP ports as needed (default 3478, 5349).

7. **Database:**
   - SQLite is file-based and included by default. For production, ensure regular backups.
   - For high scale, consider migrating to a managed SQL database.

8. **Monitoring & Logs:**
   - Use a process manager (pm2, systemd) to keep the app running.
   - Monitor logs for errors and warnings.

## License
MIT 