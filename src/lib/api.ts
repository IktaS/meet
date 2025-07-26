/// <reference types="astro/client" />

export interface ScheduleMeetingRequest {
  name: string;
  email: string;
  purpose: string;
  date: string;
  time: string;
  timezone: string;
}

export interface ScheduleMeetingResponse {
  id: string;
}

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export async function scheduleMeeting(data: ScheduleMeetingRequest): Promise<ScheduleMeetingResponse> {
  const res = await fetch(`${BACKEND_URL}/api/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to schedule meeting');
  return res.json();
} 