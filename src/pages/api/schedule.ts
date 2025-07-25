import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { randomUUID } from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { name, email, purpose, date, time, timezone } = body;
  if (!name || !email || !purpose || !date || !time || !timezone) {
    return new Response('Missing fields', { status: 400 });
  }
  // Validate date/time not in past (UTC)
  const meetingTime = new Date(`${date}T${time}:00Z`);
  if (isNaN(meetingTime.getTime()) || meetingTime < new Date()) {
    return new Response('Meeting date/time invalid or in the past', { status: 400 });
  }
  const id = randomUUID();
  const created_at = new Date().toISOString();
  try {
    db.prepare(`INSERT INTO meetings (id, name, email, purpose, date, time, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`)
      .run(id, name, email, purpose, date, time, timezone, created_at);
    return new Response(JSON.stringify({ id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Failed to save meeting', { status: 500 });
  }
}; 