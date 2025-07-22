export interface Timezone {
  value: string;
  label: string;
  offset: string;
}

export const timezones: Timezone[] = [
  { value: 'UTC', label: 'UTC', offset: '+00:00' },
  { value: 'America/New_York', label: 'America/New_York', offset: '-04:00' },
  { value: 'America/Chicago', label: 'America/Chicago', offset: '-05:00' },
  { value: 'America/Denver', label: 'America/Denver', offset: '-06:00' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles', offset: '-07:00' },
  { value: 'Europe/London', label: 'Europe/London', offset: '+01:00' },
  { value: 'Europe/Paris', label: 'Europe/Paris', offset: '+02:00' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin', offset: '+02:00' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo', offset: '+09:00' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore', offset: '+08:00' },
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta', offset: '+07:00' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney', offset: '+10:00' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata', offset: '+05:30' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai', offset: '+08:00' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg', offset: '+02:00' },
]; 