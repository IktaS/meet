<script lang="ts">
  import { onMount } from 'svelte';
  import IconMail from '~icons/tabler/mail';
  import IconUser from '~icons/tabler/user';
  import IconCalendar from '~icons/tabler/calendar';
  import IconClock from '~icons/tabler/clock';
  import IconWorld from '~icons/tabler/world';
  import IconCheck from '~icons/tabler/check';
  import IconCopy from '~icons/tabler/copy';
  import { scheduleMeeting } from '../lib/api';
  import { timezones } from '../lib/timezones';

  // Helper to get tomorrow's date in YYYY-MM-DD
  function getTomorrowDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  let name = '';
  let email = '';
  let purpose = '';
  let date = getTomorrowDate();
  let time = '19:00';
  let timezone = 'Asia/Jakarta';
  let loading = false;
  let error = '';
  let meetingId = '';
  let meetingLink = '';
  let copied = false;
  let showDateTooltip = false;
  let showTimeTooltip = false;
  let showEmailTooltip = false;
  let isFormValid = false;

  function validateEmail(email: string) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }

  function validate() {
    showDateTooltip = false;
    showTimeTooltip = false;
    if (!name.trim()) return 'Name is required';
    if (!email.trim() || !validateEmail(email)) return 'Valid email is required';
    if (!purpose.trim()) return 'Purpose is required';
    if (!date) return 'Date is required';
    if (!time) return 'Time is required';
    if (!timezone) return 'Timezone is required';

    // Combine date and time into a Date object in local time
    const selected = new Date(date + 'T' + time);
    const now = new Date();
    if (selected < now) {
      // Show tooltip on the field(s) that are in the past
      showDateTooltip = true;
      showTimeTooltip = true;
      return '';
    }
    return '';
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = validate();
    if (error) return;
    loading = true;
    meetingId = '';
    meetingLink = '';
    copied = false;
    try {
      const data = await scheduleMeeting({ name, email, purpose, date, time, timezone });
      meetingId = data.id;
      meetingLink = `/meeting/${meetingId}`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  function copyLink() {
    if (meetingLink) {
      navigator.clipboard.writeText(window.location.origin + meetingLink);
      copied = true;
      setTimeout(() => copied = false, 1500);
    }
  }

  $: {
    // Email tooltip
    showEmailTooltip = !!email && !validateEmail(email);
    // Date/time tooltip
    const selected = new Date(date + 'T' + time);
    const now = new Date();
    if (date && time && selected < now) {
      showDateTooltip = true;
      showTimeTooltip = true;
    } else {
      showDateTooltip = false;
      showTimeTooltip = false;
    }
    // Form validity
    isFormValid = !!name.trim() && !!email.trim() && validateEmail(email) && !!purpose.trim() && !!date && !!time && !!timezone && (!date || !time || selected >= now);
  }
</script>

<form class="space-y-5" on:submit|preventDefault={handleSubmit} aria-label="Schedule a meeting">
  <div>
    <label class="block text-sm font-medium mb-1" for="name">Name</label>
    <div class="flex items-center gap-2">
      <IconUser size="20" class="text-gray-400 shrink-0" />
      <input id="name" class="input input-bordered w-full" bind:value={name} required autocomplete="name" aria-required="true" aria-label="Name" placeholder="Your name" />
    </div>
  </div>
  <div>
    <label class="block text-sm font-medium mb-1" for="email">Email</label>
    <div class="flex items-center gap-2 relative">
      <IconMail size="20" class="text-gray-400 shrink-0" />
      <input id="email" class="input input-bordered w-full" type="email" bind:value={email} required autocomplete="email" aria-required="true" aria-label="Email" placeholder="you@email.com" />
      {#if showEmailTooltip}
        <span class="absolute left-1/2 -translate-x-1/2 -top-7 bg-red-500 text-white text-xs rounded px-2 py-1 shadow z-20 whitespace-nowrap">Invalid email address</span>
      {/if}
    </div>
  </div>
  <div>
    <label class="block text-sm font-medium mb-1" for="purpose">Purpose</label>
    <div class="flex items-start gap-2">
      <IconCheck size="20" class="text-gray-400 shrink-0 mt-2" />
      <textarea id="purpose" class="input input-bordered w-full min-h-[80px] resize-y" bind:value={purpose} required aria-required="true" aria-label="Purpose" placeholder="What is the purpose of the meeting?"></textarea>
    </div>
  </div>
  <div class="flex gap-2">
    <div class="flex-1">
      <label class="block text-sm font-medium mb-1" for="date">Date</label>
      <div class="flex items-center gap-2 relative">
        <IconCalendar size="20" class="text-gray-400 shrink-0" />
        <input id="date" class="input input-bordered w-full" type="date" bind:value={date} required aria-required="true" aria-label="Date" placeholder="YYYY-MM-DD" />
        {#if showDateTooltip}
          <span class="absolute left-1/2 -translate-x-1/2 -top-7 bg-red-500 text-white text-xs rounded px-2 py-1 shadow z-20 whitespace-nowrap">Date is in the past</span>
        {/if}
      </div>
    </div>
    <div class="flex-1">
      <label class="block text-sm font-medium mb-1" for="time">Time</label>
      <div class="flex items-center gap-2 relative">
        <IconClock size="20" class="text-gray-400 shrink-0" />
        <input id="time" class="input input-bordered w-full" type="time" bind:value={time} required aria-required="true" aria-label="Time" placeholder="HH:MM" />
        {#if showTimeTooltip}
          <span class="absolute left-1/2 -translate-x-1/2 -top-7 bg-red-500 text-white text-xs rounded px-2 py-1 shadow z-20 whitespace-nowrap">Date is in the past</span>
        {/if}
      </div>
    </div>
  </div>
  <div>
    <label class="block text-sm font-medium mb-1" for="timezone">Timezone</label>
    <div class="flex items-center gap-2">
      <IconWorld size="20" class="text-gray-400 shrink-0" />
      <select id="timezone" class="input input-bordered w-full" bind:value={timezone} required aria-required="true" aria-label="Timezone">
        <option value="" disabled>Select timezone</option>
        {#each timezones as tz}
          <option value={tz.value}>{tz.label} (UTC{tz.offset})</option>
        {/each}
      </select>
    </div>
  </div>
  {#if error}
    <div class="text-red-500 text-sm" role="alert">{error}</div>
  {/if}
  <button class="btn btn-primary w-full flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:text-gray-500" type="submit" disabled={loading || !isFormValid} aria-busy={loading}>
    {#if loading}
      <svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      Scheduling...
    {:else}
      <IconCheck size="20" /> Schedule Meeting
    {/if}
  </button>
  {#if meetingId}
    <div class="mt-4 text-green-600 text-center flex flex-col items-center gap-2">
      <div class="flex items-center gap-2">
        <span>Meeting scheduled!</span>
        <IconCheck size="20" />
      </div>
      <div class="flex items-center gap-2 justify-center">
        <input class="input w-full text-center" readonly value={window.location.origin + meetingLink} aria-label="Meeting link" />
        <button type="button" class="btn btn-secondary" on:click={copyLink} aria-label="Copy meeting link">
          {#if copied}
            <IconCheck size="20" />
          {:else}
            <IconCopy size="20" />
          {/if}
        </button>
      </div>
      <a class="underline text-blue-600" href={meetingLink}>Go to meeting page</a>
    </div>
  {/if}
</form>

<style>
  .input {
    @apply border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition;
  }
  .btn {
    @apply bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed;
  }
  .btn-primary {
    @apply bg-blue-600;
  }
  .btn-secondary {
    @apply bg-gray-200 text-gray-700 hover:bg-gray-300;
  }
</style> 