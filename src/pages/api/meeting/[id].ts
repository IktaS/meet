import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import type { Meeting } from '../../../types/meeting';
import { generateTurnCredentials } from '../../../lib/turn';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const id = params.id;
  const row = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
  if (!row) {
    return new Response('Meeting not found', { status: 404 });
  }
  // Convert to Meeting type and ensure created_at is ISO string
  const meeting: Meeting = {
    ...row,
    created_at: new Date(row.created_at).toISOString(),
  };
  // TURN credentials
  const turnSecret = import.meta.env.TURN_SECRET;
  const turnUrl = import.meta.env.PUBLIC_TURN_URLS;
  const turnRealm = import.meta.env.TURN_REALM || 'meet';
  let turn = null;
  if (typeof turnSecret === 'string' && typeof turnUrl === 'string') {
    // Use meeting ID as username base for uniqueness
    // Set TTL to 1 day (86400 seconds)
    const creds = generateTurnCredentials(String(id), turnSecret, 86400);
    turn = {
      urls: turnUrl.split(','),
      username: creds.username,
      credential: creds.credential,
      ttl: creds.ttl,
      realm: turnRealm
    };
  }
  return new Response(JSON.stringify({ ...meeting, turn }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}; 