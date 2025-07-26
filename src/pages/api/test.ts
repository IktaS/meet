import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  console.info('[Test API] GET request received');
  
  const serverInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: import.meta.env.MODE,
      port: import.meta.env.PORT || 4321,
      publicBackendUrl: import.meta.env.PUBLIC_BACKEND_URL,
      hasDiscordWebhook: !!import.meta.env.DISCORD_WEBHOOK_URL,
      hasTurnSecret: !!import.meta.env.TURN_SECRET,
    },
    server: {
      userAgent: 'Astro + Bun WebSocket',
      websocketSupport: true,
    }
  };
  
  console.info('[Test API] Returning server info:', serverInfo);
  
  return new Response(JSON.stringify(serverInfo, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}; 