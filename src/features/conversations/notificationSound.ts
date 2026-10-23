/** Local-only opt-in for short synthesized notification tones.
 * No media URL, external library, autoplay on page load or notification permission.
 */
const prefix = 'wapphub:message-sound:v1:';
const played = new Map<string, number>();
const MAX_PLAYED = 128;
let context: AudioContext | null = null;

export function soundPreferenceKey(userId: string, organizationId: string): string {
  return prefix + encodeURIComponent(userId) + ':' + encodeURIComponent(organizationId);
}
export function readSoundPreference(userId: string, organizationId: string): boolean {
  if (!userId || !organizationId) return false;
  try { return localStorage.getItem(soundPreferenceKey(userId, organizationId)) === 'on'; }
  catch { return false; }
}
export function saveSoundPreference(userId: string, organizationId: string, on: boolean): void {
  if (!userId || !organizationId) return;
  try { localStorage.setItem(soundPreferenceKey(userId, organizationId), on ? 'on' : 'off'); }
  catch { /* Preferences remain in the current tab if storage is unavailable. */ }
}
export function notificationIsFresh(occurredAt: string, mountedAt: number, now = Date.now()) {
  const timestamp = Date.parse(occurredAt);
  return Number.isFinite(timestamp) && timestamp >= mountedAt - 2000 && timestamp <= now + 30000;
}
export function shouldPlayForMessage(message: {
  id: string; direction: string; senderUserId: string | null; historical?: boolean;
}, userId: string): boolean {
  return !message.historical && !message.id.startsWith('optimistic:') &&
    (message.direction === 'INBOUND' || message.direction === 'INTERNAL' && message.senderUserId !== userId);
}
async function audioContext(): Promise<AudioContext | null> {
  if (typeof AudioContext === 'undefined') return null;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running' ? context : null;
  } catch { return null; }
}
/** Called synchronously from a user click to satisfy autoplay policies. */
export async function unlockNotificationAudio() { return !!(await audioContext()); }

export async function playNotificationSound(uniqueId: string): Promise<boolean> {
  if (!uniqueId) return false;
  const now = Date.now();
  if (played.has(uniqueId)) return false;
  const audio = await audioContext();
  if (!audio) return false;
  // Recheck after an asynchronous resume to avoid simultaneous notifications.
  if (played.has(uniqueId)) return false;
  played.set(uniqueId, now);
  if (played.size > MAX_PLAYED) {
    for (const [id, at] of played) if (at < now - 120000 || played.size > MAX_PLAYED) played.delete(id);
  }
  try {
    // Two gentle tones: short, non-intrusive and generated locally.
    for (const [offset, hz] of [[0, 660], [0.12, 880]] as const) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = hz;
      const start = audio.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.10);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + 0.105);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    return true;
  } catch { played.delete(uniqueId); return false; }
}
