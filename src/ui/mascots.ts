/**
 * Mascot SVG library — 6 NPCs as inline SVG strings.
 *
 * Each NPC is a single circle-head + body silhouette + emoji-face SVG.
 * Style choice: intentionally simple to stay within bundle + time budget.
 * The "personality" comes from the body color + props (apron, scarf,
 * stethoscope, etc.) plus an emoji-style face that makes the figure
 * read at small sizes.
 *
 * Animation lives in CSS (see mascot.css) — the SVG itself is static.
 * We just toggle CSS classes on the wrapper to switch idle/happy/sad.
 *
 * SVG viewBox: 0 0 100 140, drawn so the figure sits centered with
 * head around y=40 and body from y=70 to y=130.
 */

export type MascotAnim = 'idle' | 'happy' | 'sad';

export interface MascotDef {
  id: string;
  svg: string;
}

// ─── Shared building blocks ────────────────────────────────────────────────

function face(emoji: string, cx = 50, cy = 38, fontSize = 22): string {
  return `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="${fontSize}" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">${emoji}</text>`;
}

function head(skin = '#fde0c2', stroke = '#2a2730'): string {
  return `<ellipse cx="50" cy="38" rx="22" ry="24" fill="${skin}" stroke="${stroke}" stroke-width="1.5"/>`;
}

// ─── Owl (default / free practice) ─────────────────────────────────────────
// v0.7 redesign — cleaner Duo-style owl: vivid green, big sparkly eyes,
// white belly, orange triangle beak, tiny feet, soft ground shadow.
const owl = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <!-- Soft ground shadow -->
  <ellipse cx="50" cy="128" rx="26" ry="4" fill="#000000" opacity="0.12"/>
  <g class="mascot-body">
    <!-- Tufts (behind body) -->
    <path d="M22 50 Q26 36 34 44 Q30 50 26 54 Z" fill="#43a302"/>
    <path d="M78 50 Q74 36 66 44 Q70 50 74 54 Z" fill="#43a302"/>
    <!-- Body (vivid Duolingo green, rounded teardrop) -->
    <path d="M50 38 C30 38 20 56 20 80 C20 106 32 122 50 122 C68 122 80 106 80 80 C80 56 70 38 50 38 Z"
          fill="#58cc02"/>
    <!-- Belly highlight (white) -->
    <ellipse cx="50" cy="92" rx="22" ry="24" fill="#ffffff"/>
    <!-- Wings -->
    <path d="M22 76 Q14 80 18 100 Q24 104 30 96 Z" fill="#43a302"/>
    <path d="M78 76 Q86 80 82 100 Q76 104 70 96 Z" fill="#43a302"/>
    <!-- Eye whites (big) -->
    <circle cx="39" cy="68" r="13" fill="#ffffff"/>
    <circle cx="61" cy="68" r="13" fill="#ffffff"/>
    <!-- Pupils with sparkle highlights -->
    <circle cx="40" cy="69" r="6" fill="#2a2730" class="mascot-pupil mascot-eye"/>
    <circle cx="60" cy="69" r="6" fill="#2a2730" class="mascot-pupil mascot-eye mascot-eye-right"/>
    <circle cx="42" cy="66" r="2" fill="#ffffff"/>
    <circle cx="62" cy="66" r="2" fill="#ffffff"/>
    <!-- Beak (orange triangle) -->
    <path d="M50 80 L44 86 L56 86 Z" fill="#ff9600"/>
    <!-- Feet (tiny orange) -->
    <ellipse cx="42" cy="122" rx="5" ry="3" fill="#ff9600"/>
    <ellipse cx="58" cy="122" rx="5" ry="3" fill="#ff9600"/>
  </g>
</svg>`;

// ─── Waiter (restaurant) ───────────────────────────────────────────────────
// v0.7 redesign — cleaner shapes, drawn-on cute face (no emoji),
// soft ground shadow.
const waiter = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="128" rx="26" ry="4" fill="#000000" opacity="0.12"/>
  <g class="mascot-body">
    <!-- Apron back / body -->
    <path d="M22 70 Q50 64 78 70 L80 128 L20 128 Z" fill="#3a3a44"/>
    <!-- Apron front (white) -->
    <path d="M32 78 Q50 74 68 78 L68 128 L32 128 Z" fill="#ffffff"/>
    <!-- Bow tie -->
    <path d="M44 70 L40 76 L44 80 L50 76 L56 80 L60 76 L56 70 Z" fill="#e25c4d"/>
    <!-- Head (rounded) -->
    <ellipse cx="50" cy="40" rx="22" ry="24" fill="#fde0c2"/>
    <!-- Hair (smooth swoop) -->
    <path d="M28 32 Q50 18 72 32 Q70 28 66 26 Q50 22 34 26 Q30 28 28 32 Z" fill="#3a2a1a"/>
    <!-- Eyes -->
    <circle cx="42" cy="42" r="2.4" fill="#2a2730" class="mascot-pupil mascot-eye"/>
    <circle cx="58" cy="42" r="2.4" fill="#2a2730" class="mascot-pupil mascot-eye mascot-eye-right"/>
    <!-- Smile -->
    <path d="M44 50 Q50 54 56 50" fill="none" stroke="#2a2730" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Cheek blush -->
    <circle cx="36" cy="48" r="2.5" fill="#ff9b9b" opacity="0.55"/>
    <circle cx="64" cy="48" r="2.5" fill="#ff9b9b" opacity="0.55"/>
    <!-- Tray -->
    <rect x="74" y="86" width="22" height="4" rx="2" fill="#c08040"/>
    <circle cx="86" cy="82" r="3.5" fill="#fff8e8"/>
  </g>
</svg>`;

// ─── Flight Attendant (airport) ────────────────────────────────────────────
const flightAttendant = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <g class="mascot-body">
    <!-- Uniform body (navy) -->
    <path d="M22 72 Q50 64 78 72 L82 130 L18 130 Z" fill="#243a6e" stroke="#2a2730" stroke-width="1.5"/>
    <!-- Lapel V -->
    <polygon points="42,72 58,72 50,90" fill="#ffffff" stroke="#2a2730" stroke-width="0.8"/>
    <!-- Scarf (red) -->
    <path d="M38 70 Q50 76 62 70 L60 78 Q50 82 40 78 Z" fill="#e25c4d" stroke="#2a2730" stroke-width="0.8"/>
    <!-- Head -->
    ${head('#fde0c2')}
    <!-- Hair (bun) -->
    <path d="M28 32 Q50 18 72 32 Q70 24 50 22 Q30 24 28 32 Z" fill="#5a3a20"/>
    <circle cx="72" cy="22" r="5" fill="#5a3a20"/>
    <!-- Hat (small pillbox) -->
    <rect x="36" y="20" width="28" height="6" rx="2" fill="#243a6e" stroke="#2a2730" stroke-width="0.8"/>
    <!-- Wings pin -->
    <polygon points="40,86 50,90 60,86 50,92" fill="#f0c040" stroke="#2a2730" stroke-width="0.6"/>
    ${face('🙂')}
  </g>
</svg>`;

// ─── Doctor (hospital) ─────────────────────────────────────────────────────
const doctor = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <g class="mascot-body">
    <!-- White coat -->
    <path d="M22 72 Q50 64 78 72 L82 130 L18 130 Z" fill="#ffffff" stroke="#2a2730" stroke-width="1.5"/>
    <!-- Coat collar opening -->
    <polygon points="44,72 56,72 50,96" fill="#e8f3f1" stroke="#2a2730" stroke-width="0.8"/>
    <!-- Inner shirt -->
    <polygon points="46,76 54,76 52,90 48,90" fill="#3aa89b"/>
    <!-- Head -->
    ${head('#fde0c2')}
    <!-- Hair -->
    <path d="M28 30 Q50 18 72 30 L70 36 Q50 30 30 36 Z" fill="#2a2010"/>
    <!-- Stethoscope -->
    <path d="M40 80 Q36 96 42 110 Q48 116 54 110" fill="none" stroke="#2a2730" stroke-width="1.6"/>
    <circle cx="56" cy="110" r="3.5" fill="#a8a2b3" stroke="#2a2730" stroke-width="1"/>
    <!-- Pocket -->
    <rect x="60" y="100" width="12" height="14" fill="none" stroke="#a8a2b3" stroke-width="0.8"/>
    ${face('🙂')}
  </g>
</svg>`;

// ─── Coworker (office) ─────────────────────────────────────────────────────
const coworker = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <g class="mascot-body">
    <!-- Casual shirt (indigo) -->
    <path d="M22 72 Q50 66 78 72 L82 130 L18 130 Z" fill="#6a6dd3" stroke="#2a2730" stroke-width="1.5"/>
    <!-- T-shirt collar -->
    <path d="M42 70 Q50 76 58 70" fill="none" stroke="#2a2730" stroke-width="1"/>
    <!-- Head -->
    ${head('#fde0c2')}
    <!-- Hair (short, side-parted) -->
    <path d="M28 30 Q40 18 56 22 Q70 26 72 32 L70 38 Q60 28 44 30 Q34 32 30 38 Z" fill="#3a2a1a"/>
    <!-- Glasses -->
    <circle cx="40" cy="40" r="5" fill="none" stroke="#2a2730" stroke-width="1.2"/>
    <circle cx="60" cy="40" r="5" fill="none" stroke="#2a2730" stroke-width="1.2"/>
    <line x1="45" y1="40" x2="55" y2="40" stroke="#2a2730" stroke-width="1.2"/>
    <!-- Laptop in front -->
    <rect x="30" y="106" width="40" height="22" rx="2" fill="#d4d2dc" stroke="#2a2730" stroke-width="1"/>
    <rect x="34" y="110" width="32" height="14" fill="#2a2730"/>
    ${face('🙂', 50, 30, 16)}
  </g>
</svg>`;

// ─── Receptionist (hotel) ──────────────────────────────────────────────────
const receptionist = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <g class="mascot-body">
    <!-- Vest (gold) -->
    <path d="M22 72 Q50 64 78 72 L82 130 L18 130 Z" fill="#cba24a" stroke="#2a2730" stroke-width="1.5"/>
    <!-- White shirt under vest -->
    <polygon points="42,72 58,72 56,130 44,130" fill="#ffffff" stroke="#2a2730" stroke-width="0.8"/>
    <!-- Tie -->
    <polygon points="48,72 52,72 53,96 50,108 47,96" fill="#8a3a2a" stroke="#2a2730" stroke-width="0.6"/>
    <!-- Lapel -->
    <polygon points="42,72 22,72 26,90" fill="#a8852a"/>
    <polygon points="58,72 78,72 74,90" fill="#a8852a"/>
    <!-- Head -->
    ${head('#fde0c2')}
    <!-- Hair (neat) -->
    <path d="M28 30 Q50 18 72 30 L70 38 Q50 26 30 38 Z" fill="#4a2a1a"/>
    <!-- Service bell -->
    <ellipse cx="86" cy="118" rx="8" ry="6" fill="#e0b850" stroke="#2a2730" stroke-width="1"/>
    <circle cx="86" cy="112" r="2" fill="#e0b850" stroke="#2a2730" stroke-width="0.8"/>
    <rect x="80" y="124" width="12" height="3" fill="#a8852a" stroke="#2a2730" stroke-width="0.6"/>
    ${face('🙂')}
  </g>
</svg>`;

// ─── Kitten states (v0.8 story mode) ────────────────────────────────────────
//
// Warm Ghibli-esque hand-drawn feel: soft cream + earth tones, slightly
// wobbly stroke widths, no harsh outlines. Each state captures the
// emotional arc of one chapter.

// Chapter 1 — 濕毛淒冷: wet matted fur, droopy ears, big sad eyes, raindrops.
const kittenCh1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <!-- Raindrops drifting in -->
  <g opacity="0.55">
    <path d="M14 24 q-1 4 0 6 q2 2 3 0 q1 -2 0 -6 z" fill="#7aa8c8"/>
    <path d="M82 18 q-1 4 0 6 q2 2 3 0 q1 -2 0 -6 z" fill="#7aa8c8"/>
    <path d="M22 48 q-1 3 0 5 q2 2 3 0 q1 -2 0 -5 z" fill="#7aa8c8"/>
    <path d="M78 54 q-1 3 0 5 q2 2 3 0 q1 -2 0 -5 z" fill="#7aa8c8"/>
  </g>
  <!-- Damp ground puddle shadow -->
  <ellipse cx="50" cy="130" rx="28" ry="4" fill="#3a4a5a" opacity="0.18"/>
  <g class="mascot-body">
    <!-- Body: hunched, smaller, gray-tinged from wet -->
    <path d="M30 96 Q26 78 36 70 Q50 64 64 70 Q74 78 70 96 Q72 116 64 124 Q50 128 36 124 Q28 116 30 96 Z"
          fill="#b8a896" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Wet fur darker patches -->
    <path d="M38 88 Q44 84 50 88 Q56 84 62 88 Q60 96 50 96 Q40 96 38 88 Z" fill="#8a7a6a" opacity="0.55"/>
    <!-- Head -->
    <ellipse cx="50" cy="58" rx="22" ry="20" fill="#c8b6a0" stroke="#5a4a3a" stroke-width="1.4"/>
    <!-- Droopy ears (folded forward, sad) -->
    <path d="M32 50 Q26 56 32 64 Q36 60 38 54 Z" fill="#b8a896" stroke="#5a4a3a" stroke-width="1.2"/>
    <path d="M68 50 Q74 56 68 64 Q64 60 62 54 Z" fill="#b8a896" stroke="#5a4a3a" stroke-width="1.2"/>
    <!-- Inner ear pink -->
    <path d="M33 54 Q31 58 34 62" fill="none" stroke="#d8a8a8" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M67 54 Q69 58 66 62" fill="none" stroke="#d8a8a8" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Wet fur clumps on head -->
    <path d="M42 44 q2 4 0 6" stroke="#8a7a6a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M58 44 q-2 4 0 6" stroke="#8a7a6a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <!-- Big sad eyes (downturned) -->
    <ellipse cx="42" cy="60" rx="4.5" ry="5.2" fill="#ffffff"/>
    <ellipse cx="58" cy="60" rx="4.5" ry="5.2" fill="#ffffff"/>
    <ellipse cx="42" cy="62" rx="3.2" ry="3.8" fill="#3a2a1a" class="mascot-pupil mascot-eye"/>
    <ellipse cx="58" cy="62" rx="3.2" ry="3.8" fill="#3a2a1a" class="mascot-pupil mascot-eye mascot-eye-right"/>
    <circle cx="43" cy="60" r="0.9" fill="#ffffff"/>
    <circle cx="59" cy="60" r="0.9" fill="#ffffff"/>
    <!-- Droplet at one eye (tear) -->
    <path d="M40 66 q-1 3 0 4 q1 1 2 0 q1 -1 0 -4 z" fill="#7aa8c8" opacity="0.85"/>
    <!-- Nose + small downturned mouth -->
    <path d="M48 68 Q50 70 52 68 L50 70 Z" fill="#d8a8a8" stroke="#5a4a3a" stroke-width="0.8"/>
    <path d="M46 74 Q50 72 54 74" fill="none" stroke="#5a4a3a" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Tail tucked under -->
    <path d="M36 118 Q24 122 28 110" fill="none" stroke="#5a4a3a" stroke-width="1.4" stroke-linecap="round"/>
  </g>
</svg>`;

// Chapter 2 — 圓滾溫飽: fluffy, rounder, contented.
const kittenCh2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="130" rx="26" ry="4" fill="#3a2a1a" opacity="0.14"/>
  <g class="mascot-body">
    <!-- Fluffier rounder body, warmer cream tone -->
    <path d="M28 96 Q24 76 38 68 Q50 62 62 68 Q76 76 72 96 Q76 118 64 126 Q50 130 36 126 Q24 118 28 96 Z"
          fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Belly highlight -->
    <ellipse cx="50" cy="100" rx="18" ry="20" fill="#fce8c8"/>
    <!-- Head -->
    <ellipse cx="50" cy="56" rx="24" ry="22" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.5"/>
    <!-- Ears upright (perked up a bit) -->
    <path d="M30 44 L34 26 L44 42 Z" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M70 44 L66 26 L56 42 Z" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M35 32 L37 40" stroke="#d8a8a8" stroke-width="2" stroke-linecap="round"/>
    <path d="M65 32 L63 40" stroke="#d8a8a8" stroke-width="2" stroke-linecap="round"/>
    <!-- Eyes content (slightly closed half-moons) -->
    <path d="M38 58 Q42 62 46 58" fill="none" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round" class="mascot-eye"/>
    <path d="M54 58 Q58 62 62 58" fill="none" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round" class="mascot-eye mascot-eye-right"/>
    <!-- Cheek blush -->
    <ellipse cx="36" cy="64" rx="3" ry="2" fill="#f0a8a8" opacity="0.55"/>
    <ellipse cx="64" cy="64" rx="3" ry="2" fill="#f0a8a8" opacity="0.55"/>
    <!-- Nose -->
    <path d="M48 68 Q50 70 52 68 L50 70 Z" fill="#d88a78" stroke="#5a4a3a" stroke-width="0.8"/>
    <!-- Small content smile -->
    <path d="M44 74 Q50 78 56 74" fill="none" stroke="#5a4a3a" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Whiskers -->
    <line x1="28" y1="70" x2="40" y2="72" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="28" y1="74" x2="40" y2="74" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="60" y1="72" x2="72" y2="70" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="60" y1="74" x2="72" y2="74" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <!-- Tail curled up gently -->
    <path d="M70 110 Q86 108 80 94" fill="none" stroke="#5a4a3a" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Crumb on whisker (story beat) -->
    <circle cx="38" cy="76" r="1.2" fill="#c08040"/>
  </g>
</svg>`;

// Chapter 3 — 好奇玩心: head tilted, curious eyes, paw raised.
const kittenCh3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="130" rx="26" ry="4" fill="#3a2a1a" opacity="0.14"/>
  <g class="mascot-body" transform="rotate(-4 50 90)">
    <!-- Body -->
    <path d="M30 98 Q26 80 38 72 Q50 66 62 72 Q74 80 70 98 Q74 118 62 126 Q50 128 38 126 Q26 118 30 98 Z"
          fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Belly -->
    <ellipse cx="50" cy="104" rx="16" ry="18" fill="#fce8c8"/>
    <!-- Raised paw (front-left, near body's right) -->
    <ellipse cx="68" cy="100" rx="6" ry="8" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.4"/>
    <ellipse cx="68" cy="96" rx="3.5" ry="3" fill="#fce8c8"/>
    <!-- Head tilted -->
    <g transform="rotate(8 50 56)">
      <ellipse cx="50" cy="56" rx="22" ry="20" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.5"/>
      <!-- Ears -->
      <path d="M30 44 L34 28 L44 42 Z" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M70 44 L66 28 L56 42 Z" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M35 34 L37 40" stroke="#d8a8a8" stroke-width="2" stroke-linecap="round"/>
      <path d="M65 34 L63 40" stroke="#d8a8a8" stroke-width="2" stroke-linecap="round"/>
      <!-- Big round curious eyes -->
      <circle cx="42" cy="58" r="5" fill="#ffffff"/>
      <circle cx="58" cy="58" r="5" fill="#ffffff"/>
      <circle cx="42" cy="58" r="3.5" fill="#2a3a4a" class="mascot-pupil mascot-eye"/>
      <circle cx="58" cy="58" r="3.5" fill="#2a3a4a" class="mascot-pupil mascot-eye mascot-eye-right"/>
      <circle cx="43" cy="56" r="1.2" fill="#ffffff"/>
      <circle cx="59" cy="56" r="1.2" fill="#ffffff"/>
      <!-- Nose -->
      <path d="M48 66 Q50 68 52 66 L50 68 Z" fill="#d88a78" stroke="#5a4a3a" stroke-width="0.8"/>
      <!-- Tiny "o" mouth — curious -->
      <ellipse cx="50" cy="73" rx="2" ry="1.4" fill="none" stroke="#5a4a3a" stroke-width="1.2"/>
      <!-- Whiskers -->
      <line x1="28" y1="68" x2="40" y2="70" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
      <line x1="60" y1="70" x2="72" y2="68" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    </g>
    <!-- Tail flicked up -->
    <path d="M30 110 Q14 106 22 92" fill="none" stroke="#5a4a3a" stroke-width="1.6" stroke-linecap="round"/>
  </g>
</svg>`;

// Chapter 4 — 街頭自信: confident pose, slight smirk, alert ears.
const kittenCh4 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="130" rx="28" ry="4" fill="#3a2a1a" opacity="0.14"/>
  <g class="mascot-body">
    <!-- Stronger, slightly thinner body, more upright -->
    <path d="M32 100 Q28 78 40 70 Q50 64 60 70 Q72 78 68 100 Q72 122 60 128 Q50 130 40 128 Q28 122 32 100 Z"
          fill="#e8c898" stroke="#5a4a3a" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Tabby stripes (street cred) -->
    <path d="M38 86 Q40 82 38 76" stroke="#a88058" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M62 86 Q60 82 62 76" stroke="#a88058" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M42 100 Q44 98 42 94" stroke="#a88058" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M58 100 Q56 98 58 94" stroke="#a88058" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <!-- Head, slightly square -->
    <ellipse cx="50" cy="56" rx="22" ry="20" fill="#e8c898" stroke="#5a4a3a" stroke-width="1.5"/>
    <!-- Alert pointed ears -->
    <path d="M30 44 L32 22 L44 42 Z" fill="#e8c898" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M70 44 L68 22 L56 42 Z" fill="#e8c898" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M35 30 L37 40" stroke="#d8a8a8" stroke-width="2" stroke-linecap="round"/>
    <path d="M65 30 L63 40" stroke="#d8a8a8" stroke-width="2" stroke-linecap="round"/>
    <!-- Small scar mark on cheek (street life) -->
    <path d="M64 62 L68 66" stroke="#5a4a3a" stroke-width="1" stroke-linecap="round"/>
    <!-- Confident narrow eyes -->
    <path d="M38 58 Q40 56 46 58 Q42 62 38 60 Z" fill="#3a4a2a" class="mascot-eye"/>
    <path d="M54 58 Q60 56 62 58 Q58 62 54 60 Z" fill="#3a4a2a" class="mascot-eye mascot-eye-right"/>
    <circle cx="42" cy="58" r="1.2" fill="#ffffff"/>
    <circle cx="58" cy="58" r="1.2" fill="#ffffff"/>
    <!-- Nose + smirk -->
    <path d="M48 68 Q50 70 52 68 L50 70 Z" fill="#d88a78" stroke="#5a4a3a" stroke-width="0.8"/>
    <path d="M44 74 Q50 75 50 73 Q52 76 56 73" fill="none" stroke="#5a4a3a" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Whiskers -->
    <line x1="26" y1="70" x2="40" y2="72" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="60" y1="72" x2="74" y2="70" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <!-- Tail held high and proud -->
    <path d="M70 110 Q88 92 78 78" fill="none" stroke="#5a4a3a" stroke-width="1.8" stroke-linecap="round"/>
  </g>
</svg>`;

// Chapter 5 — 居家舒適: lounging on pillow, gentle smile, eyes closed.
const kittenCh5 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <!-- Pillow under -->
  <ellipse cx="50" cy="120" rx="38" ry="10" fill="#f6c890" stroke="#5a4a3a" stroke-width="1.4"/>
  <path d="M16 120 Q22 116 32 118" stroke="#5a4a3a" stroke-width="0.8" fill="none"/>
  <path d="M68 118 Q78 116 84 120" stroke="#5a4a3a" stroke-width="0.8" fill="none"/>
  <g class="mascot-body">
    <!-- Body curled / lounging (horizontal oval) -->
    <ellipse cx="50" cy="100" rx="34" ry="20" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.5"/>
    <!-- Belly highlight -->
    <ellipse cx="50" cy="106" rx="26" ry="12" fill="#fce8c8"/>
    <!-- Curled tail wrapping around body -->
    <path d="M18 102 Q14 92 22 88 Q30 86 32 94" fill="none" stroke="#5a4a3a" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Head on pillow (tilted right) -->
    <ellipse cx="60" cy="80" rx="20" ry="18" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.5"/>
    <!-- Ears (folded, relaxed) -->
    <path d="M44 70 L46 58 L54 68 Z" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M76 70 L74 58 L66 68 Z" fill="#f0d8b0" stroke="#5a4a3a" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M47 62 L48 66" stroke="#d8a8a8" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M73 62 L72 66" stroke="#d8a8a8" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Sleeping eyes (closed crescents) -->
    <path d="M50 80 Q54 84 58 80" fill="none" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round" class="mascot-eye"/>
    <path d="M62 80 Q66 84 70 80" fill="none" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round" class="mascot-eye mascot-eye-right"/>
    <!-- Cheek blush -->
    <ellipse cx="48" cy="86" rx="3" ry="2" fill="#f0a8a8" opacity="0.6"/>
    <ellipse cx="72" cy="86" rx="3" ry="2" fill="#f0a8a8" opacity="0.6"/>
    <!-- Nose + tiny content smile -->
    <path d="M58 88 Q60 90 62 88 L60 90 Z" fill="#d88a78" stroke="#5a4a3a" stroke-width="0.8"/>
    <path d="M55 92 Q60 95 65 92" fill="none" stroke="#5a4a3a" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Whiskers -->
    <line x1="40" y1="86" x2="50" y2="88" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="68" y1="88" x2="78" y2="86" stroke="#5a4a3a" stroke-width="0.8" stroke-linecap="round"/>
    <!-- Z's for sleeping -->
    <text x="78" y="58" font-size="10" font-family="serif" fill="#5a4a3a" opacity="0.55">z</text>
    <text x="84" y="50" font-size="14" font-family="serif" fill="#5a4a3a" opacity="0.55">Z</text>
  </g>
</svg>`;

// ─── Story NPCs (5, warm hand-drawn Ghibli-esque) ────────────────────────────

// Ch1 — 撐傘阿嬤
const npcGrandma = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="130" rx="26" ry="4" fill="#3a2a1a" opacity="0.16"/>
  <!-- Umbrella -->
  <path d="M14 50 Q50 18 86 50 Q70 48 50 50 Q30 48 14 50 Z" fill="#7aa8c8" stroke="#3a4a5a" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="50" y1="50" x2="50" y2="20" stroke="#3a4a5a" stroke-width="1.2"/>
  <path d="M30 50 Q30 38 50 22" fill="none" stroke="#3a4a5a" stroke-width="0.6"/>
  <path d="M70 50 Q70 38 50 22" fill="none" stroke="#3a4a5a" stroke-width="0.6"/>
  <line x1="50" y1="50" x2="50" y2="78" stroke="#5a4a3a" stroke-width="1.6"/>
  <path d="M48 78 Q50 84 54 80" fill="none" stroke="#5a4a3a" stroke-width="1.6" stroke-linecap="round"/>
  <g class="mascot-body">
    <!-- Body (warm beige cardigan) -->
    <path d="M30 88 Q50 82 70 88 L74 130 L26 130 Z" fill="#d8a878" stroke="#5a4a3a" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Cardigan opening lines -->
    <line x1="50" y1="88" x2="50" y2="128" stroke="#5a4a3a" stroke-width="0.8"/>
    <circle cx="50" cy="100" r="1.4" fill="#5a4a3a"/>
    <circle cx="50" cy="112" r="1.4" fill="#5a4a3a"/>
    <!-- Head -->
    <ellipse cx="50" cy="68" rx="16" ry="18" fill="#f6d8b8" stroke="#5a4a3a" stroke-width="1.4"/>
    <!-- White bun hair -->
    <ellipse cx="50" cy="52" rx="18" ry="10" fill="#f0ece0" stroke="#5a4a3a" stroke-width="1.2"/>
    <circle cx="50" cy="46" r="6" fill="#f0ece0" stroke="#5a4a3a" stroke-width="1.2"/>
    <!-- Cane on the side -->
    <path d="M82 96 Q86 92 88 96 L88 132" stroke="#8a6a3a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Eyes (closed gentle smile) -->
    <path d="M42 70 Q44 72 46 70" fill="none" stroke="#3a2a1a" stroke-width="1.4" stroke-linecap="round" class="mascot-eye"/>
    <path d="M54 70 Q56 72 58 70" fill="none" stroke="#3a2a1a" stroke-width="1.4" stroke-linecap="round" class="mascot-eye mascot-eye-right"/>
    <!-- Cheek blush -->
    <ellipse cx="40" cy="76" rx="2.5" ry="1.8" fill="#f0a8a8" opacity="0.65"/>
    <ellipse cx="60" cy="76" rx="2.5" ry="1.8" fill="#f0a8a8" opacity="0.65"/>
    <!-- Mouth (gentle smile) -->
    <path d="M44 80 Q50 84 56 80" fill="none" stroke="#5a4a3a" stroke-width="1.3" stroke-linecap="round"/>
    <!-- Wrinkle hint -->
    <path d="M36 72 q1 2 0 4" stroke="#5a4a3a" stroke-width="0.6" fill="none"/>
    <path d="M64 72 q-1 2 0 4" stroke="#5a4a3a" stroke-width="0.6" fill="none"/>
  </g>
</svg>`;

// Ch2 — 麵包店老闆 (white apron, flour-dusted, round)
const npcBaker = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="130" rx="28" ry="4" fill="#3a2a1a" opacity="0.16"/>
  <g class="mascot-body">
    <!-- Body (round, brown shirt) -->
    <path d="M22 86 Q50 78 78 86 L82 130 L18 130 Z" fill="#a8754a" stroke="#5a4a3a" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- White apron front -->
    <path d="M32 90 Q50 86 68 90 L66 130 L34 130 Z" fill="#fefaf0" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Apron tie around neck -->
    <path d="M44 86 Q50 80 56 86" fill="none" stroke="#5a4a3a" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Flour dust on apron -->
    <circle cx="42" cy="104" r="1.4" fill="#e8e4d8"/>
    <circle cx="58" cy="110" r="1.6" fill="#e8e4d8"/>
    <circle cx="50" cy="116" r="1.2" fill="#e8e4d8"/>
    <circle cx="46" cy="122" r="1" fill="#e8e4d8"/>
    <!-- Head (round) -->
    <ellipse cx="50" cy="62" rx="20" ry="20" fill="#f6d8b8" stroke="#5a4a3a" stroke-width="1.4"/>
    <!-- Baker hat (white, mushroom shape) -->
    <ellipse cx="50" cy="36" rx="18" ry="10" fill="#fefaf0" stroke="#5a4a3a" stroke-width="1.4"/>
    <rect x="36" y="40" width="28" height="8" rx="2" fill="#fefaf0" stroke="#5a4a3a" stroke-width="1.4"/>
    <!-- Bushy moustache -->
    <path d="M40 74 Q44 76 50 74 Q56 76 60 74 Q58 80 50 78 Q42 80 40 74 Z" fill="#8a5a3a" stroke="#5a4a3a" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Eyes (warm crescents) -->
    <path d="M40 60 Q44 64 48 60" fill="none" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round" class="mascot-eye"/>
    <path d="M52 60 Q56 64 60 60" fill="none" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round" class="mascot-eye mascot-eye-right"/>
    <!-- Cheek blush -->
    <ellipse cx="36" cy="66" rx="3" ry="2.4" fill="#f0a8a8" opacity="0.65"/>
    <ellipse cx="64" cy="66" rx="3" ry="2.4" fill="#f0a8a8" opacity="0.65"/>
    <!-- Bread loaf in hands -->
    <ellipse cx="50" cy="100" rx="14" ry="6" fill="#d8a060" stroke="#5a4a3a" stroke-width="1.3"/>
    <path d="M42 100 q2 -3 4 0" stroke="#5a4a3a" stroke-width="0.8" fill="none"/>
    <path d="M50 100 q2 -3 4 0" stroke="#5a4a3a" stroke-width="0.8" fill="none"/>
  </g>
</svg>`;

// Ch3 — 美美 (Mei-mei, ~7yo, ponytail, holding cat treats)
const npcMeimei = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="130" rx="24" ry="4" fill="#3a2a1a" opacity="0.14"/>
  <g class="mascot-body">
    <!-- Pink dress -->
    <path d="M30 86 Q50 80 70 86 L78 130 L22 130 Z" fill="#f2a8c4" stroke="#5a4a3a" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Dress collar -->
    <path d="M40 86 Q50 92 60 86" fill="none" stroke="#5a4a3a" stroke-width="1.2"/>
    <!-- Pocket detail -->
    <rect x="42" y="104" width="14" height="10" rx="1" fill="none" stroke="#5a4a3a" stroke-width="0.8"/>
    <!-- Head -->
    <ellipse cx="50" cy="62" rx="18" ry="20" fill="#f6d8b8" stroke="#5a4a3a" stroke-width="1.4"/>
    <!-- Hair (front bangs) -->
    <path d="M32 56 Q34 42 50 42 Q66 42 68 56 Q60 50 50 52 Q40 50 32 56 Z" fill="#5a3a1a" stroke="#3a2a1a" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Ponytail on the side -->
    <path d="M68 60 Q82 62 84 76 Q80 80 76 76 Q72 70 68 64 Z" fill="#5a3a1a" stroke="#3a2a1a" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Pink ponytail tie -->
    <ellipse cx="74" cy="64" rx="3" ry="2" fill="#e7659c" stroke="#5a4a3a" stroke-width="0.8"/>
    <!-- Eyes (big and shy) -->
    <ellipse cx="42" cy="64" rx="3" ry="4" fill="#ffffff"/>
    <ellipse cx="58" cy="64" rx="3" ry="4" fill="#ffffff"/>
    <ellipse cx="42" cy="65" rx="2.2" ry="3" fill="#3a2a1a" class="mascot-pupil mascot-eye"/>
    <ellipse cx="58" cy="65" rx="2.2" ry="3" fill="#3a2a1a" class="mascot-pupil mascot-eye mascot-eye-right"/>
    <circle cx="43" cy="64" r="0.8" fill="#ffffff"/>
    <circle cx="59" cy="64" r="0.8" fill="#ffffff"/>
    <!-- Cheek blush -->
    <ellipse cx="36" cy="72" rx="2.4" ry="1.8" fill="#f0a8a8" opacity="0.7"/>
    <ellipse cx="64" cy="72" rx="2.4" ry="1.8" fill="#f0a8a8" opacity="0.7"/>
    <!-- Small mouth (shy smile) -->
    <path d="M46 78 Q50 80 54 78" fill="none" stroke="#5a4a3a" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Treat bag held in front -->
    <rect x="40" y="98" width="20" height="14" rx="2" fill="#fce8c8" stroke="#5a4a3a" stroke-width="1.2"/>
    <text x="50" y="108" text-anchor="middle" font-size="6" font-family="system-ui" fill="#5a4a3a">treat</text>
    <circle cx="44" cy="106" r="1" fill="#c08040"/>
    <circle cx="56" cy="108" r="1" fill="#c08040"/>
  </g>
</svg>`;

// Ch4 — 布魯托 (one-eyed stray dog, scruffy, protective)
const npcBrutus = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="130" rx="30" ry="4" fill="#3a2a1a" opacity="0.18"/>
  <g class="mascot-body">
    <!-- Body (bigger, rough fur) -->
    <path d="M22 96 Q18 76 34 70 Q50 64 66 70 Q82 76 78 96 Q82 122 64 128 Q50 130 36 128 Q18 122 22 96 Z"
          fill="#8a6a4a" stroke="#3a2a1a" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- Fur tufts (scruffy) -->
    <path d="M28 90 q-3 4 0 8" stroke="#5a4a2a" stroke-width="1.4" fill="none"/>
    <path d="M72 88 q3 4 0 8" stroke="#5a4a2a" stroke-width="1.4" fill="none"/>
    <path d="M40 124 q-1 4 -3 6" stroke="#5a4a2a" stroke-width="1.2" fill="none"/>
    <path d="M60 124 q1 4 3 6" stroke="#5a4a2a" stroke-width="1.2" fill="none"/>
    <!-- Head -->
    <ellipse cx="50" cy="58" rx="24" ry="22" fill="#8a6a4a" stroke="#3a2a1a" stroke-width="1.6"/>
    <!-- Floppy ears -->
    <path d="M26 50 Q18 70 30 78 Q34 70 34 56 Z" fill="#6a4a2a" stroke="#3a2a1a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M74 50 Q82 70 70 78 Q66 70 66 56 Z" fill="#6a4a2a" stroke="#3a2a1a" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Snout -->
    <ellipse cx="50" cy="74" rx="14" ry="10" fill="#a88058" stroke="#3a2a1a" stroke-width="1.4"/>
    <!-- Nose -->
    <ellipse cx="50" cy="70" rx="4" ry="3" fill="#2a1a0a"/>
    <!-- Mouth (slight smile) -->
    <path d="M44 80 Q50 84 56 80" fill="none" stroke="#3a2a1a" stroke-width="1.4" stroke-linecap="round"/>
    <!-- One good eye (open) -->
    <circle cx="40" cy="56" r="4" fill="#ffffff"/>
    <circle cx="40" cy="56" r="2.6" fill="#3a2a1a" class="mascot-pupil mascot-eye"/>
    <circle cx="41" cy="55" r="0.8" fill="#ffffff"/>
    <!-- Closed/scarred eye (X) -->
    <line x1="56" y1="52" x2="64" y2="60" stroke="#3a2a1a" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="64" y1="52" x2="56" y2="60" stroke="#3a2a1a" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Scar across nose -->
    <path d="M44 38 L52 44" stroke="#3a2a1a" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Tail (low, alert) -->
    <path d="M74 110 Q88 108 86 96" fill="none" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round"/>
  </g>
</svg>`;

// Ch5 — 美美的爸媽 + 美美 (family trio, warm living-room vibe)
const npcFamily = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <ellipse cx="50" cy="132" rx="38" ry="4" fill="#3a2a1a" opacity="0.16"/>
  <!-- Warm lamp glow halo (suggests living room) -->
  <circle cx="50" cy="70" r="44" fill="#fce8a0" opacity="0.25"/>
  <g class="mascot-body">
    <!-- Dad (left) -->
    <ellipse cx="24" cy="68" rx="11" ry="12" fill="#f6d8b8" stroke="#5a4a3a" stroke-width="1.3"/>
    <path d="M14 60 Q16 50 24 50 Q34 50 36 60 L34 64 Q24 58 16 64 Z" fill="#3a2a1a" stroke="#2a1a0a" stroke-width="1"/>
    <path d="M14 86 Q24 80 34 86 L36 130 L12 130 Z" fill="#5a7a98" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Dad face -->
    <circle cx="20" cy="68" r="1.3" fill="#3a2a1a" class="mascot-eye"/>
    <circle cx="28" cy="68" r="1.3" fill="#3a2a1a" class="mascot-eye mascot-eye-right"/>
    <path d="M20 74 Q24 76 28 74" fill="none" stroke="#5a4a3a" stroke-width="1.2" stroke-linecap="round"/>

    <!-- Mom (right) -->
    <ellipse cx="76" cy="68" rx="11" ry="12" fill="#f6d8b8" stroke="#5a4a3a" stroke-width="1.3"/>
    <!-- Mom hair (shoulder-length) -->
    <path d="M66 60 Q70 48 80 50 Q88 54 88 64 L86 76 Q82 70 76 72 Q70 70 66 76 Z" fill="#5a3a1a" stroke="#3a2a1a" stroke-width="1.2"/>
    <path d="M64 86 Q76 80 88 86 L88 130 L64 130 Z" fill="#d8788a" stroke="#5a4a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Mom face -->
    <path d="M70 68 Q72 70 74 68" fill="none" stroke="#3a2a1a" stroke-width="1.4" stroke-linecap="round" class="mascot-eye"/>
    <path d="M78 68 Q80 70 82 68" fill="none" stroke="#3a2a1a" stroke-width="1.4" stroke-linecap="round" class="mascot-eye mascot-eye-right"/>
    <path d="M72 74 Q76 76 80 74" fill="none" stroke="#5a4a3a" stroke-width="1.2" stroke-linecap="round"/>

    <!-- Mei-mei (center, smaller, between parents) -->
    <ellipse cx="50" cy="86" rx="9" ry="10" fill="#f6d8b8" stroke="#5a4a3a" stroke-width="1.3"/>
    <!-- Mei-mei hair -->
    <path d="M42 80 Q44 70 50 70 Q56 70 58 80 Q54 76 50 78 Q46 76 42 80 Z" fill="#5a3a1a" stroke="#3a2a1a" stroke-width="1"/>
    <!-- Ponytail -->
    <ellipse cx="59" cy="82" rx="3" ry="5" fill="#5a3a1a" stroke="#3a2a1a" stroke-width="1"/>
    <!-- Mei-mei dress -->
    <path d="M42 102 Q50 98 58 102 L60 130 L40 130 Z" fill="#f2a8c4" stroke="#5a4a3a" stroke-width="1.3" stroke-linejoin="round"/>
    <!-- Mei-mei face -->
    <circle cx="46" cy="86" r="1.1" fill="#3a2a1a" class="mascot-eye"/>
    <circle cx="54" cy="86" r="1.1" fill="#3a2a1a" class="mascot-eye mascot-eye-right"/>
    <path d="M46 90 Q50 92 54 90" fill="none" stroke="#5a4a3a" stroke-width="1" stroke-linecap="round"/>

    <!-- Tiny heart between them -->
    <path d="M50 56 q-3 -4 -6 -2 q-3 3 0 6 q3 3 6 5 q3 -2 6 -5 q3 -3 0 -6 q-3 -2 -6 2 z" fill="#e7659c" opacity="0.85"/>
  </g>
</svg>`;

export const MASCOTS: Record<string, MascotDef> = {
  owl: { id: 'owl', svg: owl },
  waiter: { id: 'waiter', svg: waiter },
  flightAttendant: { id: 'flightAttendant', svg: flightAttendant },
  doctor: { id: 'doctor', svg: doctor },
  coworker: { id: 'coworker', svg: coworker },
  receptionist: { id: 'receptionist', svg: receptionist },
  // v0.8 story mode — kitten states
  kittenCh1: { id: 'kittenCh1', svg: kittenCh1 },
  kittenCh2: { id: 'kittenCh2', svg: kittenCh2 },
  kittenCh3: { id: 'kittenCh3', svg: kittenCh3 },
  kittenCh4: { id: 'kittenCh4', svg: kittenCh4 },
  kittenCh5: { id: 'kittenCh5', svg: kittenCh5 },
  // v0.8 story mode — NPCs
  npcGrandma: { id: 'npcGrandma', svg: npcGrandma },
  npcBaker: { id: 'npcBaker', svg: npcBaker },
  npcMeimei: { id: 'npcMeimei', svg: npcMeimei },
  npcBrutus: { id: 'npcBrutus', svg: npcBrutus },
  npcFamily: { id: 'npcFamily', svg: npcFamily },
};

export function getMascotSvg(id: string): string {
  return (MASCOTS[id] ?? MASCOTS.owl).svg;
}
