#!/usr/bin/env node
/**
 * generate-grandma-audio.js — v2.0.B.10 ElevenLabs edition
 *
 * Generates MP3 audio for every sentence in public/lessons-ch{N}.json
 * using ElevenLabs TTS API. Default voice = Rachel (warm female, ideal
 * for kind-grandmother narration). Override via ELEVENLABS_VOICE_ID env.
 *
 * Cost (2026-05):
 *   - FREE tier: 10,000 chars/month — Ch1 dedupe ~2,500 chars FITS FREE
 *   - Creator: $11/mo for 30k chars
 *
 * Setup:
 *   1. Sign up at elevenlabs.io (free, no card)
 *   2. Settings → API Keys → Create new key
 *   3. Put ELEVENLABS_API_KEY=... in .env at repo root
 *   4. node tools/generate-grandma-audio.js [chapterId]
 *
 * Voice candidates (pre-made, free-tier accessible):
 *   - Rachel (21m00Tcm4TlvDq8ikWAM) — DEFAULT, warm female ⭐
 *   - Bella (EXAVITQu4vr4xnSDxMaL) — gentle female
 *   - Domi (AZnzlk1XvdvUeBnXmlld) — mature female
 *   - Antoni (ErXwobaYiN019PkySvjV) — mature male
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Load API key (env or .env)
if (!process.env.ELEVENLABS_API_KEY) {
  const envPath = resolve(repoRoot, '.env');
  if (existsSync(envPath)) {
    const envText = readFileSync(envPath, 'utf-8');
    const match = envText.match(/^ELEVENLABS_API_KEY=(.+)$/m);
    if (match) {
      process.env.ELEVENLABS_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}
if (!process.env.ELEVENLABS_API_KEY) {
  console.error('Missing ELEVENLABS_API_KEY. Set in env or .env file.');
  console.error('Get one at https://elevenlabs.io/ Profile → API Keys (free tier).');
  process.exit(1);
}

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
const MODEL_ID = 'eleven_multilingual_v2';

const chapterId = parseInt(process.argv[2] ?? '1', 10);
if (chapterId < 1 || chapterId > 8) {
  console.error(`Invalid chapter id: ${chapterId}. Must be 1-8.`);
  process.exit(1);
}

const lessonsPath = resolve(repoRoot, `public/lessons-ch${chapterId}.json`);
if (!existsSync(lessonsPath)) {
  console.error(`Lesson file not found: ${lessonsPath}`);
  process.exit(1);
}

const audioDir = resolve(repoRoot, 'public/audio/lessons');
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf-8'));

function substitute(s) {
  return s.replace(/\{catName\}/g, 'Mochi').replace(/\{dogName\}/g, 'Hana');
}

// Dedupe: multiple Q can share a sentence; one MP3 per unique text.
// Filename uses first Q's id that owns the sentence.
const tasks = [];
const seenSentences = new Map(); // sentence -> first Q id
for (const lesson of lessons) {
  for (const q of lesson.questions) {
    if (!q.sentence) continue;
    const text = substitute(q.sentence);
    if (seenSentences.has(text)) continue;
    seenSentences.set(text, q.id);
    const filename = `${q.id}.mp3`;
    const filePath = resolve(audioDir, filename);
    if (existsSync(filePath)) {
      console.log(`SKIP ${filename} (exists)`);
      continue;
    }
    tasks.push({ id: q.id, text, filePath });
  }
}

console.log(`Generating ${tasks.length} audio files for chapter ${chapterId}...`);
console.log(`Voice: ${VOICE_ID}`);
console.log(`Output: ${audioDir}\n`);

const totalChars = tasks.reduce((sum, t) => sum + t.text.length, 0);
console.log(`Char budget for this run: ${totalChars} (free tier 10,000/month).\n`);

let success = 0;
let failed = 0;
const startTime = Date.now();

for (const task of tasks) {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: task.text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.55,        // warm grandma cadence — not too robotic
            similarity_boost: 0.75,
            style: 0.20,            // slight expressiveness
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error(`FAIL ${task.id}: ${res.status} ${errText.slice(0, 200)}`);
      failed += 1;
      // If 401/429, stop early — auth or quota issue
      if (res.status === 401 || res.status === 429) {
        console.error('Stopping due to auth/quota error.');
        break;
      }
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(task.filePath, buf);
    success += 1;
    process.stdout.write(`OK ${task.id} `);
    if (success % 6 === 0) process.stdout.write('\n');
    // Light rate-limit: 200ms between calls (free tier is generous)
    await new Promise(r => setTimeout(r, 200));
  } catch (e) {
    console.error(`\nFAIL ${task.id}: ${e.message}`);
    failed += 1;
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n\nDone in ${elapsedSec}s. ${success} generated, ${failed} failed.`);
console.log(`MP3 files in: ${audioDir}`);
console.log(`Next: tell Claude "跑完了" — it'll wire tts.ts to use the MP3s + redeploy.`);
