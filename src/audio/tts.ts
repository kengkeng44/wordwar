/**
 * Text-to-speech with pre-generated MP3 priority + Web Speech fallback.
 *
 * v2.0.B.11 — wires OpenAI-generated grandma voice MP3s.
 *
 * Architecture:
 *   1. At module load, fetch lessons-ch{1..8}.json, build text -> audioId
 *      lookup map. Keys are sentences with {catName}/{dogName}
 *      substituted with defaults (Mochi/Hana) — matches script generation.
 *   2. On speak(text):
 *      - If lookup hits, play /audio/lessons/{audioId}.mp3 (real grandma)
 *      - Else fall back to Web Speech API (robotic but free + universal)
 *   3. Players who customised cat/dog names won't match lookup
 *      and get Web Speech fallback. Acceptable trade-off (customisers
 *      opt in to robotic voice).
 *
 * Why this works without changing 6 callsites:
 *   - speak(text, lang) signature unchanged
 *   - Lookup is internal; callers don't pass audioId
 *   - stopSpeaking() handles both audio paths
 */

// text -> audioId (Q id) for pre-generated MP3 lookup
const audioLookup = new Map<string, string>();
// v2.0.B.32: mochi narration set — texts whose voice should be the young
// boy Mochi voice (echo), NOT grandma shimmer. ChapterIntro/EndScene
// narration chunks are 1st-person Mochi POV.
const mochiTexts = new Set<string>();
let lookupPromise: Promise<void> | null = null;

function applyDefaults(s: string): string {
  return s.replace(/\{catName\}/g, 'Mochi').replace(/\{dogName\}/g, 'Hana');
}

// djb2 hash → 8 hex chars. Matches tools/generate-grandma-audio.js hash.
function hash8(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}

function splitChunks(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

async function loadAudioLookup(): Promise<void> {
  // Only Ch1 ships with MP3s today. Add Ch2+ here as chapters land.
  const chapters = [1];
  for (const ch of chapters) {
    try {
      const res = await fetch(`/lessons-ch${ch}.json`);
      if (!res.ok) continue;
      const lessons = await res.json();
      for (const lesson of lessons) {
        for (const q of lesson.questions) {
          if (!q.sentence || !q.id) continue;
          indexLookup(q.sentence, q.id);
        }
      }
    } catch {}
  }

  // v2.0.B.29: also index v1.x story-kitten.json sentences + Ch1 narration/outro
  try {
    const res2 = await fetch('/story-kitten.json');
    if (res2.ok) {
      const v1q = await res2.json();
      for (const q of v1q) {
        if (q.sentence && q.id) indexLookup(q.sentence, q.id);
      }
    }
  } catch {}
  const narrationBlocks = [
    'I am {catName}. I am a stray cat.\n\nEvery night, I visit one yard. Grandma and her dog {dogName} are there.\n\nGrandma tells stories. I listen with {dogName}.\n\nTonight, she tells one about me…',
    'The story ends. {dogName} is asleep on the floor.\n\nI walk back to the street. Goodnight, Grandma. Goodnight, {dogName}.\n\nSee you tomorrow night.',
  ];
  for (const block of narrationBlocks) {
    const subbed = applyDefaults(block);
    for (const part of subbed.split(/\n+/).map(s => s.trim()).filter(Boolean)) {
      indexLookup(part, hash8(part));
      // v2.0.B.32: mark all narration chunks as Mochi voice (1st-person POV)
      mochiTexts.add(part);
      for (const chunk of splitChunks(part)) mochiTexts.add(chunk);
    }
  }

  // v2.0.B.67: Ch1 question audio POV split. Outer-frame questions
  // (Q2/Q3/Q7/Q8) are Mochi 1st-person → Mochi voice. Inner-story Q4/Q5/Q6
  // stay grandma voice (her storytelling). Q1 already covered by narration.
  const mochiQuestions = [
    "Every night I visit Grandma's yard.",
    "{dogName} is Grandma's brown dog.",
    "Goodnight, Grandma.",
    "Four words I want to remember from tonight.",
  ];
  for (const raw of mochiQuestions) {
    const text = applyDefaults(raw);
    mochiTexts.add(text);
    for (const chunk of splitChunks(text)) mochiTexts.add(chunk);
  }
  return;
}

function indexLookup(rawSentence: string, fullId: string): void {
  const fullText = applyDefaults(rawSentence);
  if (!audioLookup.has(fullText)) audioLookup.set(fullText, fullId);
  const chunks = splitChunks(fullText);
  if (chunks.length > 1) {
    for (const chunk of chunks) {
      if (!audioLookup.has(chunk)) audioLookup.set(chunk, hash8(chunk));
    }
  }
}

function ensureLookup(): Promise<void> {
  if (!lookupPromise) {
    lookupPromise = loadAudioLookup();
  }
  return lookupPromise;
}

// Eagerly start lookup at module evaluation
if (typeof window !== 'undefined') {
  void ensureLookup();
}

let activeAudio: HTMLAudioElement | null = null;

// v2.0.B.70: persistent Audio element reused across speak() calls. iOS
// Safari allows audio.play() outside user-gesture context IF the SAME
// audio element was previously played during a gesture. We prime this
// element on first user gesture (unlockAudio) so subsequent setTimeout
// autoSpeak calls can play() without NotAllowedError.
let persistentAudio: HTMLAudioElement | null = null;
function getPersistentAudio(): HTMLAudioElement {
  if (!persistentAudio) persistentAudio = new Audio();
  return persistentAudio;
}

function cleanText(text: string): string {
  return text.replace(/_{2,}/g, ' ').replace(/\s+/g, ' ').trim();
}

function speakWebSpeech(text: string, lang: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    // v1.9.38 audit-2 F10: rate 0.85 — A2 Taiwanese learners need slower
    u.rate = 0.85;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

function debugLog(msg: string) {
  // v2.0.B.51: silent debug — only console, no DOM overlay (user feedback:
  // scary error messages confusing UX). Audio failures fall back to
  // WebSpeech silently; user just sees no auto-play and taps 🔊 manually.
  if (typeof console !== 'undefined') console.log('[TTS]', msg);
}

export function speak(text: string, lang = 'en-US'): void {
  const cleaned = cleanText(text);
  if (!cleaned) {
    debugLog('speak: empty text');
    return;
  }

  stopSpeaking();

  const mapSize = audioLookup.size;
  // v2.0.B.32: Mochi voice for 1st-person narration sentences
  const isMochi = mochiTexts.has(cleaned);
  const audioId = audioLookup.get(cleaned);

  if (audioId && typeof Audio !== 'undefined') {
    try {
      const url = isMochi
        ? `/audio/lessons/mochi-${hash8(cleaned)}.mp3`
        : `/audio/lessons/${audioId}.mp3`;
      debugLog(`${isMochi?'🐱':'👵'} try: ${audioId} map=${mapSize}`);
      // v2.0.B.71: reuse the persistent audio element + call .load() after
      // src change to force iOS to fetch + decode the new file. Without
      // .load() the change can race with prior play() Promise.
      const audio = getPersistentAudio();
      audio.src = url;
      audio.load();
      audio.playbackRate = 1.0;
      audio.volume = 1.0;
      audio.muted = false;
      activeAudio = audio;
      audio.play().then(() => {
        // v2.0.B.50: skip stale "OK" log when activeAudio has moved on.
        if (activeAudio === audio) debugLog(`MP3 play OK: ${audioId}`);
      }).catch((err) => {
        // v2.0.B.50: stale-promise guard. If user advanced (q1→q2) before
        // this audio's play() Promise settled, the activeAudio slot has
        // already been replaced or nulled by stopSpeaking(). The rejection
        // is from a torn-down audio element — NOT a real failure on the
        // current question. Skip the debug overlay AND the WebSpeech
        // fallback (which would speak old sentence on new screen).
        if (activeAudio !== audio) return;
        debugLog(`MP3 play FAIL: ${err?.name || 'err'} → WebSpeech`);
        activeAudio = null;
        speakWebSpeech(cleaned, lang);
      });
      audio.addEventListener('ended', () => {
        if (activeAudio === audio) activeAudio = null;
      });
      return;
    } catch (e: any) {
      debugLog(`MP3 ctor FAIL: ${e?.message?.slice(0,40)}`);
    }
  } else {
    debugLog(`no mp3id (map=${mapSize}) txt=${cleaned.slice(0,40)} → WebSpeech`);
  }
  speakWebSpeech(cleaned, lang);
}

export function stopSpeaking(): void {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      // v2.0.B.50: iOS WebKit decoder release. Without src='', the buffer
      // keeps a soft reference and subsequent play() calls (on the same or
      // a new audio element) may race with the half-paused stream and
      // resolve via NotAllowedError. Clearing src fully tears down.
      activeAudio.src = '';
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis;
}

// v2.0.B.33: helper for queue-based playback (ChapterIntroScene start button).
// Returns MP3 URL for a sentence or null if no MP3 available.
export function mp3UrlFor(text: string): string | null {
  const cleaned = cleanText(text);
  if (!cleaned) return null;
  const audioId = audioLookup.get(cleaned);
  if (!audioId) return null;
  return mochiTexts.has(cleaned)
    ? `/audio/lessons/mochi-${hash8(cleaned)}.mp3`
    : `/audio/lessons/${audioId}.mp3`;
}

export function ensureLookupReady(): Promise<void> {
  return ensureLookup();
}

export const IS_IOS_DEVICE: boolean =
  typeof navigator !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

// v2.0.B.69: iOS audio unlock — Web Audio path (more reliable than HTML5
// Audio + data URI). On first user gesture: (1) resume AudioContext from
// suspended state via existing AudioManager singleton; (2) schedule a silent
// 1-sample buffer source → satisfies iOS "user has interacted with audio".
// Subsequent setTimeout audio.play() works. B.68's malformed data: URI was
// 90 chars (too short to be a valid MP3) — Web Audio is more reliable.
let isAudioUnlocked = false;

function unlockAudio(): void {
  if (isAudioUnlocked) return;
  // (a) Web Audio context resume — iOS unlock signal for AudioContext.
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      if (ctx.state === 'suspended') void ctx.resume();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {}
  // (b) Prime the persistent HTML5 Audio element with a tiny real silent
  // MP3 (854 bytes). iOS attaches gesture-token to this specific element
  // once play() resolves → future speak() calls reuse this element + can
  // .play() from setTimeout contexts without NotAllowedError.
  try {
    const a = getPersistentAudio();
    a.muted = true;
    a.volume = 0;
    a.src = '/silent.mp3';
    a.load();
    void a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      a.volume = 1;
      a.src = '';
      isAudioUnlocked = true;
    }).catch(() => {
      // ignore; will retry on next gesture (isAudioUnlocked stays false)
    });
  } catch {}
}

if (typeof window !== 'undefined') {
  const unlockOnce = () => unlockAudio();
  window.addEventListener('touchstart', unlockOnce, { capture: true, passive: true });
  window.addEventListener('click', unlockOnce, { capture: true });
  window.addEventListener('pointerdown', unlockOnce, { capture: true });
}

export function autoSpeak(text: string, lang = 'en-US', delayMs = 280): void {
  // Skip on iOS only if unlock hasn't fired yet — first gesture hasn't happened
  if (IS_IOS_DEVICE && !isAudioUnlocked) return;
  window.setTimeout(() => speak(text, lang), delayMs);
}
