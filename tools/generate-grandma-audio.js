#!/usr/bin/env node
/**
 * generate-grandma-audio.js — v2.0 post-ship feature
 *
 * Generates MP3 audio for every sentence in public/lessons-ch{N}.json
 * using OpenAI TTS (`gpt-4o-mini-tts` model, `shimmer` voice with
 * "kind grandmother bedtime storyteller" instruction).
 *
 * Cost estimate (2026-05): Ch1 (~110 sentences × ~10 words) ≈ $0.05.
 * Full 8 chapters ≈ $0.40. Cheaper than a coffee.
 *
 * Idempotent: skips files that already exist. Re-run safely.
 *
 * Setup:
 *   1. npm install openai  (one-time)
 *   2. Set OPENAI_API_KEY in .env or shell env
 *   3. node tools/generate-grandma-audio.js [chapterId]
 *      (default: 1; pass 2/3/.../8 for other chapters once they ship)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  // Try loading from .env file
  const envPath = resolve(repoRoot, '.env');
  if (existsSync(envPath)) {
    const envText = readFileSync(envPath, 'utf-8');
    const match = envText.match(/^OPENAI_API_KEY=(.+)$/m);
    if (match) {
      process.env.OPENAI_API_KEY = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Set in env or .env file.');
  process.exit(1);
}

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

// Apply default name placeholders so the generated audio matches what
// new players hear (per-player customization stays in Web Speech fallback)
function substitute(s) {
  return s.replace(/\{catName\}/g, 'Mochi').replace(/\{dogName\}/g, 'Hana');
}

// Collect all unique sentences across lessons.
// Multiple Q can share a sentence; dedupe by sentence text to save API calls.
const tasks = [];
const seenSentences = new Set();
for (const lesson of lessons) {
  for (const q of lesson.questions) {
    if (!q.sentence) continue;
    const text = substitute(q.sentence);
    if (seenSentences.has(text)) continue;
    seenSentences.add(text);
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
console.log(`Output: ${audioDir}`);

const VOICE = 'shimmer';
const MODEL = 'gpt-4o-mini-tts';
const INSTRUCTIONS = 'Speak warmly, slowly, and gently — like a kind grandmother telling a bedtime story to her cat and dog. Pause between sentences for clarity.';

let success = 0;
let failed = 0;

for (const task of tasks) {
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
        input: task.text,
        instructions: INSTRUCTIONS,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`FAIL ${task.id}: ${res.status} ${errText.slice(0, 200)}`);
      failed += 1;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(task.filePath, buf);
    success += 1;
    process.stdout.write(`OK ${task.id} (${buf.length} bytes) `);
    if (success % 8 === 0) process.stdout.write('\n');
  } catch (e) {
    console.error(`FAIL ${task.id}: ${e.message}`);
    failed += 1;
  }
}

console.log(`\n\nDone. ${success} generated, ${failed} failed, ${tasks.length - success - failed} skipped.`);
console.log(`MP3 files in: ${audioDir}`);
console.log(`Next: git add public/audio/lessons/ && commit + deploy.`);
