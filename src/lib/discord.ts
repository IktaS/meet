// src/lib/discord.ts
export async function sendDiscordNotification(content: string) {
  const webhookUrl = import.meta.env.DISCORD_WEBHOOK_URL;
  console.info('[Discord] DISCORD_WEBHOOK_URL (import.meta.env):', webhookUrl);
  if (!webhookUrl) {
    console.warn('No Discord webhook URL configured');
    return;
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  const text = await res.text();
  if (res.status >= 400) {
    console.error('[Discord] Webhook response status:', res.status);
    console.error('[Discord] Webhook response body:', text);
  } else {
    console.info('[Discord] Webhook response status:', res.status);
    console.debug('[Discord] Webhook response body:', text);
  }
}

export async function sendMeetingDiscordNotification({ name, email, purpose, date, time, timezone, meetingLink }: {
  name: string;
  email: string;
  purpose: string;
  date: string;
  time: string;
  timezone: string;
  meetingLink: string;
}) {
  const content =
    `📅 New meeting created! @everyone\n` +
    `**Name:** ${name}\n` +
    `**Email:** ${email}\n` +
    `**Purpose:** ${purpose}\n` +
    `**Date:** ${date} ${time} (${timezone})\n` +
    `**Meeting Link:** ${meetingLink}`;
  await sendDiscordNotification(content);
} 