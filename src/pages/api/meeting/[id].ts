import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import type { Meeting } from '../../../types/meeting';

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
  return new Response(JSON.stringify(meeting), { status: 200, headers: { 'Content-Type': 'application/json' } });
}; 