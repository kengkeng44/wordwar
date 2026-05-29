#!/usr/bin/env node
/**
 * generate-mascots.js — Pickup v2.0 post-ship feature
 *
 * Generates character variants via OpenAI gpt-image-1 (transparent PNG).
 * Saves to public/mascots/preview/ — does NOT overwrite existing
 * iso-grandma.webp / iso-shiba.webp etc. User reviews, picks best,
 * Claude moves the chosen file to the real asset path + commits.
 *
 * Cost (2026-05):
 *   - low quality: $0.04/img
 *   - medium quality: $0.11/img (default)
 *   - high quality: $0.19/img
 *   Default 6 PNGs medium ≈ $0.66.
 *
 * Setup:
 *   1. OPENAI_API_KEY in env or .env (or via `infisical run --`)
 *   2. node tools/generate-mascots.js [grandma|shiba|both] [n=3] [quality]
 *
 * Examples:
 *   node tools/generate-mascots.js           # both, 3 variants each, medium
 *   node tools/generate-mascots.js grandma 5 # only grandma, 5 variants
 *   node tools/generate-mascots.js both 2 low # cheap exploration
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Load API key (env or .env)
if (!process.env.OPENAI_API_KEY) {
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
  console.error('Missing OPENAI_API_KEY. Set via .env or `infisical run --`.');
  process.exit(1);
}

// Args
const target = (process.argv[2] || 'both').toLowerCase();
const variantsPerChar = parseInt(process.argv[3] || '3', 10);
const quality = (process.argv[4] || 'medium').toLowerCase();
if (!['low', 'medium', 'high'].includes(quality)) {
  console.error('quality must be low / medium / high');
  process.exit(1);
}

// Pickup brand palette + style — Duolingo character DNA aesthetic
const STYLE_BASE = `CRITICAL STYLE REFERENCE: emulate Duolingo's official character design language. Specifically reference Duolingo characters: Lin (kindly grandmother figure with grey hair bun), Junior (round small kid), Lily (teen), Bea (athletic), Oscar (older man), Eddy (cool guy), Vikram, Lucy. The visual DNA is:
- Bold solid color blocks with clean smooth shape silhouettes
- Big simplified facial features: oval pupils with tiny white highlight dot, simple curved smile line, single eyebrow stroke
- LARGE head 40-50% of body height, SMALL chunky body, short legs, big round hands/paws
- Soft cel-shading: one base color tone + one slightly darker shadow tone per zone (NOT realistic gradient, NOT flat-only)
- Outlines: VERY soft and clean — only at silhouette edges, NOT bold black ink outline (NOT RUMBO style, NOT Sanrio thick lines). Think Duolingo's clean vector aesthetic.
- Friendly, inviting, slightly silly even when serious — never corporate

Studio Ghibli warm palette injected into Duolingo character DNA.

PALETTE LOCK: amber #e7a44a, cream #fef8ed, coffee brown #8b6f4a, olive green #7d9a4f, warm dark text #3c2a1c. Avoid bright Disney saturation. Avoid Duolingo bright green #58cc02.

SHADING: gentle soft cel-shading only. Flat color blocks. NO gradient. NO halo. NO glow. NO blur drop shadow. NO baked floor shadow under character.

CRITICAL — what NOT to include (runtime app draws these):
- NO white tile platform under character
- NO sticker die-cut border around character
- NO drop shadow blob under character
- NO baked ellipse floor beneath
- The character must stand cleanly on transparent background. The Pickup app composites a solid ellipse floor shadow (rgba(60,42,28,0.3), zero blur) at runtime beneath the character — your output must NOT include any pre-baked shadow.

OUTPUT: Square 1024x1024. Pure transparent background. Character occupies center, feet touch lower-middle of canvas (not bottom edge — leave ~15% bottom margin for runtime ellipse). NO text, NO words, NO speech bubbles.`;

const CHARACTERS = {
  grandma: {
    name: 'iso-grandma',
    prompt: `${STYLE_BASE}

Subject: A blocky stylized cute elderly East Asian grandmother sitting on a small low wooden chair, reading from a small open storybook on her lap. Bedtime storytelling pose (NOT umbrella-holding).

CHARACTER STYLE — BLOCKY + KAWAII:
- Body shapes are SIMPLIFIED, BLOCKY, CHUBBY rectangles and ovals — like Lego/Pop Mart vinyl figure style. NOT realistic anatomy.
- 50% head proportion (very large head, very small body)
- Cute exaggerated features:
  - EYES: gently CLOSED into upward crescent smile lines (瞇瞇眼 squinted happy eyes — like Doraemon's mom or a Studio Ghibli granny mid-laugh). NOT big round open dot eyes.
  - WRINKLES: DEEPER and LONGER laugh-line wrinkles radiating from eye corners and around mouth — exaggerated for cuteness, soft brown lines. These are a CHARACTER feature, not realistic detail.
  - Soft curved warm smile mouth, slightly open
  - Round soft glasses sit lightly on nose, lenses slightly tinted cream
- Silver-white hair in low neat bun, simplified blocky shape
- Wearing chunky warm amber knitted cardigan (simplified rectangular body shape) over cream blouse, brown long skirt
- Hands are soft simplified mitten-shapes resting on book
- Chair: small chunky brown wood, simplified rectangles

CAMERA + POSE — FOR MAP LEFT-SIDE PLACEMENT:
- 3/4 view angle, character is turned slightly to the right (body angled ~25-30° to her right, face slightly turned so she looks toward the right side of the canvas) — she will be placed on the LEFT side of the game map, facing right toward the lesson buttons curving on her right
- Slight forward lean as if reading aloud to listeners on her right
- The chair + character form one solid unified silhouette

Inspired by: Doraemon's grandmother / Studio Ghibli grannies (warm, wise, gentle) + Pop Mart blocky vinyl figure simplicity + Duolingo cell-shading. Avoid Western Disney realism. Avoid bold ink outline (RUMBO-style is wrong here).`,
  },
  speaker: {
    name: 'icon-speaker',
    prompt: `${STYLE_BASE.replace('CRITICAL STYLE REFERENCE: emulate Duolingo\'s official character design language.', 'CRITICAL STYLE: a clean Duolingo-style flat icon (NOT a character).')}

Subject: A stylized speaker / loudspeaker icon, designed for a UI button in a learning app. The speaker body is a chunky cube/trapezoid shape in WARM AMBER #e7a44a, with a slightly darker COFFEE BROWN #8b6f4a 3D-depth side (soft cel-shaded, NO gradient). Three curved sound-wave arcs emit from the right side of the speaker, in OLIVE GREEN #7d9a4f — three increasingly large arcs.

CRITICAL — palette restriction: ONLY use amber/coffee/olive/cream/warm-dark. ABSOLUTELY NO orange (no #ff7a3a, no #ff4500), NO red, NO Disney-bright saturation. The previous v1.9.41 icon had an orange-red 3D-depth side + orange sound waves that clashed with Pickup's warm Ghibli palette — this regen must replace those with olive + coffee.

Composition: speaker occupies roughly 70% of canvas, centered. Sound waves on right side. Subtle base shadow as one solid coffee ellipse beneath (NOT blurry, NOT separate). Soft round cute proportions, very friendly. No text, no words.`,
  },
  shiba: {
    name: 'iso-shiba',
    prompt: `${STYLE_BASE}

Subject: A blocky stylized cute chibi shiba inu dog (柴犬), sitting upright in relaxed listening posture. NO cushion or pillow underneath.

CHARACTER STYLE — BLOCKY + KAWAII (mirror Grandma's aesthetic for visual cohesion):
- Body shapes SIMPLIFIED, BLOCKY, CHUBBY — Lego/Pop Mart vinyl figure simplicity. NOT realistic shiba anatomy.
- 45-50% head proportion (very large head, very small body)
- EYES: gently closed into upturned crescent smile lines (瞇瞇眼 squinted happy eyes) — matches Grandma's eye design for cohesion
- Soft curved warm smile, tip of pink tongue slightly visible
- Round chunky face with classic shiba mask: orange-amber back of head + cream face/cheeks/muzzle
- Body: orange-amber back, cream belly + paws, simplified blocky proportions
- Fluffy curled tail wrapped at LEFT side (relative to dog) — runtime placement on RIGHT side of map curve
- Paws are soft simplified mitten-shapes

CAMERA + POSE — FOR MAP RIGHT-SIDE PLACEMENT:
- 3/4 view angle, character turned slightly to the LEFT (body angled ~25-30° to her left, face slightly turned so the dog looks toward the LEFT side of the canvas) — she will be placed on the RIGHT side of the game map, facing left toward Grandma + the lesson buttons curving on her left
- Sitting upright attentive listening pose, slight forward lean
- Compact unified silhouette

Inspired by: blocky chibi shiba inu plush + Doraemon's pet shapes + Pop Mart vinyl figure simplicity + Studio Ghibli small animals (warm, friendly, calm). Avoid Western Disney realism. Avoid bold ink outline (RUMBO is wrong here).`,
  },
};

const targets = target === 'both' ? ['grandma', 'shiba'] : [target];
const invalidTargets = targets.filter((t) => !CHARACTERS[t]);
if (invalidTargets.length) {
  console.error(`Unknown character(s): ${invalidTargets.join(', ')}. Use grandma | shiba | both.`);
  process.exit(1);
}

const previewDir = resolve(repoRoot, 'public/mascots/preview');
if (!existsSync(previewDir)) {
  mkdirSync(previewDir, { recursive: true });
}

console.log(`Generating ${variantsPerChar} variants × ${targets.length} character(s) at ${quality} quality...`);
console.log(`Output: ${previewDir}`);
console.log(`Estimated cost: $${(targets.length * variantsPerChar * { low: 0.04, medium: 0.11, high: 0.19 }[quality]).toFixed(2)}\n`);

let success = 0;
let failed = 0;

for (const charKey of targets) {
  const char = CHARACTERS[charKey];
  for (let i = 1; i <= variantsPerChar; i++) {
    const filename = `${char.name}-v${i}.png`;
    const filePath = resolve(previewDir, filename);
    if (existsSync(filePath)) {
      console.log(`SKIP ${filename} (exists — delete to regenerate)`);
      continue;
    }
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: char.prompt,
          n: 1,
          size: '1024x1024',
          quality,
          output_format: 'png',
          background: 'transparent',
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`FAIL ${filename}: ${res.status} ${errText.slice(0, 300)}`);
        failed += 1;
        if (res.status === 401 || res.status === 429) {
          console.error('Stopping due to auth/quota.');
          break;
        }
        continue;
      }
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) {
        console.error(`FAIL ${filename}: no b64_json in response`);
        failed += 1;
        continue;
      }
      const buf = Buffer.from(b64, 'base64');
      writeFileSync(filePath, buf);
      success += 1;
      console.log(`OK ${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`FAIL ${filename}: ${e.message}`);
      failed += 1;
    }
  }
}

console.log(`\nDone. ${success} generated, ${failed} failed.`);
console.log(`Preview at: ${previewDir}`);
console.log(`Next: tell Claude "生完了" — Claude will Read each PNG to display them in chat for you to pick.`);
