import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { randomUUID } from 'crypto';
import { sendMeetingDiscordNotification } from '../../lib/discord';
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid or missing JSON body', { status: 400 });
  }
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
    // Only send Discord notification if DB insert succeeded
    try {
      const backendUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const meetingLink = `${backendUrl}/meeting/${id}`;
      await sendMeetingDiscordNotification({ name, email, purpose, date, time, timezone, meetingLink });
    } catch (err) {
      console.error('Failed to send Discord notification:', err);
    }
    return new Response(JSON.stringify({ id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response('Failed to save meeting', { status: 500 });
  }
}; 