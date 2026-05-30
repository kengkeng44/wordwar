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

import { audio as audioMgr } from './AudioManager';

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
// audio element was previously played during a gesture.
let persistentAudio: HTMLAudioElement | null = null;
function getPersistentAudio(): HTMLAudioElement {
  if (!persistentAudio) persistentAudio = new Audio();
  return persistentAudio;
}

// v2.0.B.75: silent looping HTML5 Audio that forces page to media channel
// (vs ringer channel) on iOS — so Web Audio plays even with side-switch muted.
let silentLoopAudio: HTMLAudioElement | null = null;

// v2.0.B.73: Web Audio API path. Per research, HTML5 Audio + setTimeout
// is fundamentally unreliable on iOS Safari — gesture token doesn't survive
// the async gap. Web Audio is the canonical fix: AudioContext.resume() in
// gesture, AudioBufferSourceNode plays from any context including setTimeout.
// We pre-fetch + decode MP3s to AudioBuffers, cache them, and play via Web
// Audio when available. Falls back to HTML5 Audio on platforms without it.
// v2.0.B.90 CRITICAL: use AudioManager's singleton AudioContext instead of
// creating a separate one. tts.ts and AudioManager.ts were creating TWO
// independent AudioContexts on iOS — AudioManager gets unlocked when SFX
// fire (button taps), but tts.ts's ctx never received gesture-resume signal,
// so Web Audio playback rejected. ONE singleton = both SFX + speech unlock
// together on first gesture.
const audioBufferCache = new Map<string, AudioBuffer>();
let currentSource: AudioBufferSourceNode | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    return audioMgr.ensureContext() ?? null;
  } catch {
    return null;
  }
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (audioBufferCache.has(url)) return audioBufferCache.get(url) ?? null;
  const ctx = getAudioCtx();
  if (!ctx) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const buf = await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(ab.slice(0), resolve, reject);
    });
    audioBufferCache.set(url, buf);
    return buf;
  } catch (e) {
    debugLog(`buffer load fail: ${url} ${(e as Error)?.message?.slice(0, 40)}`);
    return null;
  }
}

function fallbackWebSpeech(text: string, lang: string): void {
  speakWebSpeech(text, lang);
}

function playBuffer(buf: AudioBuffer): boolean {
  const ctx = getAudioCtx();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    if (currentSource) {
      try { currentSource.stop(); } catch {}
      currentSource = null;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => { if (currentSource === src) currentSource = null; };
    src.start(0);
    currentSource = src;
    return true;
  } catch (e) {
    debugLog(`webaudio play fail: ${(e as Error)?.message?.slice(0, 40)}`);
    return false;
  }
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

// v2.0.B.79 per agent Bug B+C: dropped Howler.js entirely. Web Audio cache
// path is primary; HTML5 persistent Audio + WebSpeech are fallbacks.
let activeBufferSource: AudioBufferSourceNode | null = null;

export function speak(text: string, lang = 'en-US'): void {
  const cleaned = cleanText(text);
  if (!cleaned) {
    debugLog('speak: empty text');
    return;
  }

  stopSpeaking();

  const mapSize = audioLookup.size;
  const isMochi = mochiTexts.has(cleaned);
  const audioId = audioLookup.get(cleaned);

  if (audioId) {
    const url = isMochi
      ? `/audio/lessons/mochi-${hash8(cleaned)}.mp3`
      : `/audio/lessons/${audioId}.mp3`;
    debugLog(`${isMochi?'🐱':'👵'} speak: ${audioId} map=${mapSize}`);

    // PRIMARY: Web Audio cached buffer (instant, gesture-token-immune)
    const cached = audioBufferCache.get(url);
    if (cached) {
      if (playBuffer(cached)) {
        debugLog(`webaudio play OK: ${audioId}`);
        return;
      }
    }

    // SECONDARY: async load + play once loaded
    void loadBuffer(url).then(buf => {
      if (buf) {
        if (playBuffer(buf)) debugLog(`webaudio play (post-load) OK: ${audioId}`);
        else fallbackWebSpeech(cleaned, lang);
      } else {
        fallbackWebSpeech(cleaned, lang);
      }
    });
    return;
  } else {
    debugLog(`no mp3id (map=${mapSize}) txt=${cleaned.slice(0,40)} → WebSpeech`);
  }
  speakWebSpeech(cleaned, lang);
}

export function stopSpeaking(): void {
  // v2.0.B.79: stop Web Audio source first
  if (activeBufferSource) {
    try { activeBufferSource.stop(); } catch {}
    activeBufferSource = null;
  }
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
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

// v2.0.B.76: synchronous warm-up — called from a user-gesture click handler
// (e.g. ChapterIntro Next CTA). Fetches + decodes ALL chapter audio into
// AudioBuffer cache while we still have the gesture token. Returns Promise
// that resolves when all done; caller can await before transitioning to
// PlayScene so first Q1 mount hits cache instantly. Solves: iOS 18 private-
// browsing strict sync-call-stack requirement + cache-miss network delay.
export async function warmUpChapterAudio(chapter: number): Promise<void> {
  // Ensure lookup is loaded (audioLookup populated from JSON fetches).
  await ensureLookup();
  void chapter; // currently lookup covers all chapters once loaded
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }
  // Collect all URLs to preload (mochi-{hash} for Mochi POV, otherwise audioId)
  const urls = new Set<string>();
  for (const [text, id] of audioLookup.entries()) {
    if (mochiTexts.has(text)) {
      urls.add(`/audio/lessons/mochi-${hash8(text)}.mp3`);
    } else {
      urls.add(`/audio/lessons/${id}.mp3`);
    }
  }
  // Parallel fetch + decode — race the lot, ignore individual failures
  await Promise.allSettled(Array.from(urls).map(u => loadBuffer(u)));
  debugLog(`warmUp Ch${chapter}: ${audioBufferCache.size} buffers cached`);
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
  // v2.0.B.79 per agent audit Bug A: set flag SYNCHRONOUSLY at top, before
  // any Promise. B.68-B.78 set it only in a .then() that often never fired
  // on iOS → flag stuck false → autoSpeak silently no-op'd for Q1/Q2 forever.
  // The actual unlock IS the synchronous Web Audio src.start(0) below.
  isAudioUnlocked = true;

  // Silent loop for ringer-channel bypass (WebKit Bug 237322).
  try {
    if (!silentLoopAudio) {
      silentLoopAudio = new Audio('/silent.mp3');
      silentLoopAudio.loop = true;
      silentLoopAudio.volume = 0;
      silentLoopAudio.preload = 'auto';
    }
    void silentLoopAudio.play().catch(() => {});
  } catch {}

  // Shared AudioContext resume + silent buffer source (the real unlock).
  try {
    const ctx = getAudioCtx();
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {}
  // (b) Prime the persistent HTML5 Audio element (fallback path).
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
      isAudioUnlocked = true;
    }).catch(() => {});
  } catch {}

  // v2.0.B.74: defer preload until audioLookup is ready (audioLookup is
  // populated async from JSON fetches; immediate Array.from(...) at first
  // gesture may see an empty map).
  void ensureLookup().then(() => {
    try {
      const preloadUrls = Array.from(audioLookup.entries()).slice(0, 32).map(([text, id]) => {
        return mochiTexts.has(text)
          ? `/audio/lessons/mochi-${hash8(text)}.mp3`
          : `/audio/lessons/${id}.mp3`;
      });
      for (const url of preloadUrls) void loadBuffer(url);
    } catch {}
  });
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
