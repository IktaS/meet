import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = () => {
  console.info('[Test] GET request received');
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Server is running'
  }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
}; 