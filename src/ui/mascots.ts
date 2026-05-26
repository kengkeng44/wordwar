/**
 * Mascot SVG library — RUMBO sticker / iconic cartoon style (v0.8.4 iteration 2).
 *
 * Visual rules (upgraded from v0.8.3):
 *  - PRIMARY outline 5px (head/body silhouette), SECONDARY 3px (small details)
 *  - PURE FLAT COLORS in figure — no gradients, no filters, no textures
 *  - BIG round head (~45-55% of canvas height)
 *  - Halo: bigger (r~52) + stronger opacity (0.85-0.95) + subtle radial gradient
 *    allowed ON HALO ONLY (background depth cue, never on figure)
 *  - Ground shadow ellipse under every figure for weight/grounding
 *  - Distinctive pose per character (twists, raised arms, head tilts, huddles)
 *  - 1-2 contextual background elements per character (sparkles, droplets, dust)
 *  - Iconic prop with text/numerals where possible (drawn as path, NEVER emoji)
 *  - Round-dot eyes + confident curve mouth + signature accent color
 *  - Warm-dark #1a1a1a, never pure #000. Cream #fef8ed, never stark white.
 *
 * SVG viewBox: 0 0 100 140 — animation system depends on this.
 * CSS class names (`mascot-body`, `mascot-pupil`, `mascot-eye`,
 * `mascot-eye-right`) are preserved for animation hooks.
 */

export type MascotAnim = 'idle' | 'happy' | 'sad';

export interface MascotDef {
  id: string;
  svg: string;
}

// ─── Owl (default / free practice) ─────────────────────────────────────────
// Wing-raised greeting pose, sage halo, sparkle accents, "HI" on headband.
const owl = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="owl-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#c8e6c2"/>
      <stop offset="100%" stop-color="#86c780"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="70" r="52" fill="url(#owl-halo)" opacity="0.9"/>
  <!-- Sparkle context elements -->
  <g fill="#fef8ed" stroke="none">
    <path d="M14 30 L16 34 L20 36 L16 38 L14 42 L12 38 L8 36 L12 34 Z"/>
    <path d="M86 26 L87 29 L90 30 L87 31 L86 34 L85 31 L82 30 L85 29 Z"/>
    <path d="M88 92 L89 95 L92 96 L89 97 L88 100 L87 97 L84 96 L87 95 Z"/>
  </g>
  <!-- Ground shadow -->
  <ellipse cx="50" cy="133" rx="22" ry="2.5" fill="#1a1a1a" opacity="0.18"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Body teardrop (cream) — slight tilt for shoulder twist -->
    <path d="M48 42 C24 44 16 68 18 90 C20 114 34 128 52 128 C70 128 84 112 82 88 C80 66 72 40 48 42 Z" fill="#fef8ed" stroke-width="5"/>
    <!-- Belly highlight (sub-shape) -->
    <ellipse cx="50" cy="100" rx="20" ry="22" fill="#f4e1c0" stroke="none"/>
    <!-- Left wing raised (waving!) -->
    <path d="M22 78 Q8 60 12 46 Q22 50 28 70 Z" fill="#fcd34d" stroke-width="4"/>
    <!-- Right wing tucked -->
    <path d="M78 84 Q88 96 80 114 Q70 110 70 96 Z" fill="#fcd34d" stroke-width="4"/>
    <!-- Headband (signature yellow) with "HI" text drawn as paths -->
    <path d="M22 56 Q50 44 78 56 L78 64 Q50 54 22 64 Z" fill="#fcd34d" stroke-width="4"/>
    <!-- "H" -->
    <path d="M44 56 L44 62 M44 59 L48 59 M48 56 L48 62" stroke-width="2" fill="none"/>
    <!-- "I" -->
    <path d="M54 56 L54 62" stroke-width="2" fill="none"/>
    <!-- Eye whites (bigger) -->
    <circle cx="38" cy="78" r="10" fill="#fef8ed" stroke-width="4"/>
    <circle cx="62" cy="78" r="10" fill="#fef8ed" stroke-width="4"/>
    <!-- Pupils -->
    <circle cx="38" cy="78" r="5" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="62" cy="78" r="5" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <!-- Eye highlights -->
    <circle cx="39.5" cy="76" r="1.6" fill="#fef8ed" stroke="none"/>
    <circle cx="63.5" cy="76" r="1.6" fill="#fef8ed" stroke="none"/>
    <!-- Beak -->
    <path d="M50 88 L44 96 L56 96 Z" fill="#f97316" stroke-width="3"/>
    <!-- Feet -->
    <path d="M40 126 L36 132 M40 126 L40 133 M40 126 L44 132" stroke-width="3" fill="none"/>
    <path d="M60 126 L56 132 M60 126 L60 133 M60 126 L64 132" stroke-width="3" fill="none"/>
  </g>
</svg>`;

// ─── Waiter (restaurant) ───────────────────────────────────────────────────
// Balanced-tray pose with steaming dish, red bowtie, "★" on apron.
const waiter = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="waiter-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fef8ed"/>
      <stop offset="100%" stop-color="#fcd34d"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="70" r="52" fill="url(#waiter-halo)" opacity="0.9"/>
  <!-- Steam wisps (context) -->
  <g fill="none" stroke="#fef8ed" stroke-width="2.5" stroke-linecap="round">
    <path d="M76 30 Q74 24 78 20 Q82 16 80 10"/>
    <path d="M82 32 Q84 26 82 22"/>
  </g>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.18"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Body / shirt -->
    <path d="M22 84 Q26 70 50 70 Q74 70 78 84 L80 132 L20 132 Z" fill="#fef8ed" stroke-width="5"/>
    <!-- Apron (warm-dark) -->
    <path d="M34 86 L66 86 L70 132 L30 132 Z" fill="#1a1a1a" stroke-width="4"/>
    <!-- Star on apron (signature pride mark) -->
    <path d="M50 108 L52 112 L57 113 L53 117 L54 122 L50 119 L46 122 L47 117 L43 113 L48 112 Z" fill="#fcd34d" stroke-width="2"/>
    <!-- Apron tie at neck -->
    <path d="M40 86 Q50 78 60 86" fill="none" stroke-width="3"/>
    <!-- Head -->
    <circle cx="50" cy="40" r="26" fill="#fde4c8" stroke-width="5"/>
    <!-- Hair cap -->
    <path d="M26 38 Q26 18 50 16 Q74 18 74 38 Q70 28 50 28 Q30 28 26 38 Z" fill="#1a1a1a" stroke-width="4"/>
    <!-- Eyes -->
    <circle cx="42" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="58" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <circle cx="43" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <circle cx="59" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <!-- Smile -->
    <path d="M44 52 Q50 57 56 52" fill="none" stroke-width="3"/>
    <!-- Red bowtie (signature) -->
    <path d="M42 68 L42 76 L50 72 L58 76 L58 68 L50 72 Z" fill="#dc2626" stroke-width="3"/>
    <circle cx="50" cy="72" r="1.8" fill="#1a1a1a" stroke="none"/>
    <!-- Raised right arm holding tray -->
    <path d="M78 84 Q90 70 86 56" fill="none" stroke-width="5"/>
    <!-- Tray (cream oval) -->
    <ellipse cx="86" cy="50" rx="14" ry="4" fill="#fef8ed" stroke-width="4"/>
    <!-- Dish on tray -->
    <ellipse cx="86" cy="46" rx="8" ry="3" fill="#dc2626" stroke-width="3"/>
  </g>
</svg>`;

// ─── Flight Attendant (airport) ────────────────────────────────────────────
// Safety-briefing pointing pose, navy uniform, "✈" amber wings pin.
const flightAttendant = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="fa-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#93c5fd"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="70" r="52" fill="url(#fa-halo)" opacity="0.9"/>
  <!-- Cloud puff context -->
  <g fill="#fef8ed" stroke="none" opacity="0.85">
    <ellipse cx="14" cy="24" rx="10" ry="5"/>
    <ellipse cx="8" cy="24" rx="6" ry="4"/>
    <ellipse cx="86" cy="100" rx="10" ry="5"/>
  </g>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.18"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Uniform body (navy) -->
    <path d="M22 84 Q26 70 50 70 Q74 70 78 84 L80 132 L20 132 Z" fill="#1e3a8a" stroke-width="5"/>
    <!-- White lapel V -->
    <path d="M42 70 L50 88 L58 70 Z" fill="#fef8ed" stroke-width="3"/>
    <!-- Wings pin (amber plane shape) -->
    <path d="M40 94 L50 92 L60 94 L56 96 L50 95 L44 96 Z" fill="#fcd34d" stroke-width="2.5"/>
    <circle cx="50" cy="94" r="1.5" fill="#1a1a1a" stroke="none"/>
    <!-- Head -->
    <circle cx="50" cy="40" r="26" fill="#f5e6d3" stroke-width="5"/>
    <!-- Hair bun -->
    <path d="M26 36 Q28 18 50 16 Q72 18 74 36 Q70 28 50 28 Q30 28 26 36 Z" fill="#3d2817" stroke-width="4"/>
    <circle cx="76" cy="22" r="7" fill="#3d2817" stroke-width="3"/>
    <!-- Hat (navy) -->
    <path d="M30 22 Q50 14 70 22 L67 32 L33 32 Z" fill="#1e3a8a" stroke-width="4"/>
    <!-- Hat insignia (gold dot) -->
    <circle cx="50" cy="24" r="2" fill="#fcd34d" stroke-width="1.5"/>
    <!-- Eyes (looking to side — directing) -->
    <circle cx="44" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="60" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <circle cx="45" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <circle cx="61" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <!-- Smile -->
    <path d="M44 52 Q50 56 56 52" fill="none" stroke-width="3"/>
    <!-- Cheek blush -->
    <circle cx="34" cy="50" r="3.2" fill="#f4a8a8" opacity="0.75" stroke="none"/>
    <circle cx="66" cy="50" r="3.2" fill="#f4a8a8" opacity="0.75" stroke="none"/>
    <!-- Pointing arm (right, safety-briefing toward exit) -->
    <path d="M78 86 Q92 82 96 70" fill="none" stroke-width="5"/>
    <!-- Pointing hand -->
    <circle cx="96" cy="68" r="4" fill="#f5e6d3" stroke-width="3"/>
    <path d="M96 64 L96 56" stroke-width="3" fill="none"/>
  </g>
</svg>`;

// ─── Doctor (hospital) ─────────────────────────────────────────────────────
// Stethoscope-listening pose (hand at chest), green cross with "+" sign.
const doctor = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="doc-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#d1fae5"/>
      <stop offset="100%" stop-color="#6ee7b7"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="70" r="52" fill="url(#doc-halo)" opacity="0.88"/>
  <!-- Pulse line context (top right) -->
  <path d="M70 24 L76 24 L80 16 L84 32 L88 24 L94 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.18"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Coat -->
    <path d="M22 84 Q26 70 50 70 Q74 70 78 84 L80 132 L20 132 Z" fill="#fef8ed" stroke-width="5"/>
    <!-- Coat opening line -->
    <path d="M50 88 L50 132" fill="none" stroke-width="3"/>
    <!-- Green cross badge with "+" -->
    <rect x="60" y="92" width="14" height="14" fill="#10b981" stroke-width="3"/>
    <path d="M67 95 L67 103 M63 99 L71 99" stroke="#fef8ed" stroke-width="2.5" fill="none"/>
    <!-- Stethoscope (around neck + listening end at chest) -->
    <path d="M38 72 Q32 90 38 102 Q44 106 50 100" fill="none" stroke-width="3"/>
    <path d="M62 72 Q68 90 56 96" fill="none" stroke-width="3"/>
    <circle cx="50" cy="100" r="5" fill="#10b981" stroke-width="3"/>
    <circle cx="50" cy="100" r="2" fill="#1a1a1a" stroke="none"/>
    <!-- Head -->
    <circle cx="50" cy="40" r="26" fill="#fde4c8" stroke-width="5"/>
    <!-- Hair -->
    <path d="M26 36 Q28 16 50 14 Q72 16 74 36 Q68 26 50 26 Q32 26 26 36 Z" fill="#1a1a1a" stroke-width="4"/>
    <!-- Doctor headband / forehead reflector ring -->
    <path d="M34 30 Q50 24 66 30" fill="none" stroke-width="3"/>
    <circle cx="50" cy="28" r="3" fill="#fcd34d" stroke-width="2"/>
    <!-- Eyes -->
    <circle cx="42" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="58" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <circle cx="43" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <circle cx="59" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <!-- Gentle smile -->
    <path d="M44 52 Q50 55 56 52" fill="none" stroke-width="3"/>
    <!-- Cheek blush -->
    <circle cx="36" cy="50" r="3" fill="#f4a8a8" opacity="0.7" stroke="none"/>
    <circle cx="64" cy="50" r="3" fill="#f4a8a8" opacity="0.7" stroke="none"/>
  </g>
</svg>`;

// ─── Coworker (office) ─────────────────────────────────────────────────────
// Leaning forward with laptop showing "WIFI" wave bars, glasses, coffee steam.
const coworker = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="cow-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="70" r="52" fill="url(#cow-halo)" opacity="0.85"/>
  <!-- Coffee cup with steam (context, top right) -->
  <g fill="none" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5">
    <path d="M78 30 L82 30 Q84 30 84 32 L84 38 Q84 42 82 42 L80 42 Q78 42 78 38 Z" fill="#fef8ed"/>
    <path d="M76 32 L80 18" stroke-width="2"/>
    <path d="M82 32 L86 18" stroke-width="2"/>
  </g>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.18"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Shirt (orange) — leaning slightly forward -->
    <path d="M22 86 Q28 72 50 70 Q72 72 78 86 L80 132 L20 132 Z" fill="#f97316" stroke-width="5"/>
    <!-- T-shirt collar -->
    <path d="M42 72 Q50 80 58 72" fill="none" stroke-width="3"/>
    <!-- Head (tilted slightly forward) -->
    <circle cx="50" cy="40" r="26" fill="#fde4c8" stroke-width="5"/>
    <!-- Hair side-part -->
    <path d="M26 36 Q30 16 54 16 Q72 18 74 36 Q66 26 50 26 Q34 28 26 36 Z" fill="#3d2817" stroke-width="4"/>
    <!-- Glasses frames -->
    <circle cx="40" cy="42" r="7" fill="#fef8ed" stroke-width="3.5"/>
    <circle cx="60" cy="42" r="7" fill="#fef8ed" stroke-width="3.5"/>
    <path d="M47 42 L53 42" stroke-width="3"/>
    <!-- Eyes (focused) -->
    <circle cx="40" cy="42" r="2.2" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="60" cy="42" r="2.2" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <!-- Mild smile -->
    <path d="M44 54 Q50 58 56 54" fill="none" stroke-width="3"/>
    <!-- Laptop -->
    <rect x="28" y="106" width="44" height="24" rx="2" fill="#1a1a1a" stroke-width="4"/>
    <rect x="32" y="110" width="36" height="16" fill="#fcd34d" stroke-width="2"/>
    <!-- WiFi bars on laptop screen -->
    <path d="M50 122 L50 122.5" stroke="#1a1a1a" stroke-width="2.5"/>
    <path d="M46 118 Q50 116 54 118" fill="none" stroke="#1a1a1a" stroke-width="2"/>
    <path d="M44 114 Q50 110 56 114" fill="none" stroke="#1a1a1a" stroke-width="2"/>
  </g>
</svg>`;

// ─── Receptionist (hotel) ──────────────────────────────────────────────────
// Ringing the bell — hand raised mid-DING with motion lines, gold halo.
const receptionist = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="rec-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fcd34d"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="70" r="52" fill="url(#rec-halo)" opacity="0.9"/>
  <!-- Motion "DING" lines around bell (context) -->
  <g fill="none" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round">
    <path d="M88 92 L94 88"/>
    <path d="M90 100 L96 100"/>
    <path d="M88 108 L94 112"/>
  </g>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.18"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Jacket (burgundy) -->
    <path d="M22 84 Q26 70 50 70 Q74 70 78 84 L80 132 L20 132 Z" fill="#7f1d1d" stroke-width="5"/>
    <!-- White shirt -->
    <path d="M44 72 L56 72 L54 100 L46 100 Z" fill="#fef8ed" stroke-width="3"/>
    <!-- Gold tie -->
    <path d="M48 74 L52 74 L51 98 L49 98 Z" fill="#fcd34d" stroke-width="2.5"/>
    <!-- Head -->
    <circle cx="50" cy="40" r="26" fill="#fde4c8" stroke-width="5"/>
    <!-- Hair -->
    <path d="M26 36 Q28 16 50 14 Q72 16 74 36 Q66 26 50 26 Q34 26 26 36 Z" fill="#6b4a2a" stroke-width="4"/>
    <!-- Eyes -->
    <circle cx="42" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="58" cy="42" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <circle cx="43" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <circle cx="59" cy="41" r="1.1" fill="#fef8ed" stroke="none"/>
    <!-- Welcoming smile -->
    <path d="M42 52 Q50 58 58 52" fill="none" stroke-width="3"/>
    <!-- Cheek blush -->
    <circle cx="36" cy="50" r="3" fill="#f4a8a8" opacity="0.75" stroke="none"/>
    <circle cx="64" cy="50" r="3" fill="#f4a8a8" opacity="0.75" stroke="none"/>
    <!-- Raised right arm (ringing bell) -->
    <path d="M78 84 Q88 78 84 64" fill="none" stroke-width="5"/>
    <circle cx="84" cy="62" r="4" fill="#fde4c8" stroke-width="3"/>
    <!-- Service bell on counter (gold dome) -->
    <path d="M72 116 Q80 102 88 116 L88 122 L72 122 Z" fill="#fcd34d" stroke-width="3"/>
    <circle cx="80" cy="102" r="2.2" fill="#fcd34d" stroke-width="2"/>
    <rect x="70" y="122" width="20" height="4" fill="#1a1a1a" stroke="none"/>
  </g>
</svg>`;

// ─── Kitten Ch1 — wet, cold, curled tight ──────────────────────────────────
// Rain streaks all around, hunched into ball, tear, droopy ears.
// v1.4 MVP: kittenCh1 now uses the user-generated calico anchor PNG
// (from Claude Design / ChatGPT chat). Wrapped in SVG to maintain the
// existing inline-render API. Other 15 mascots still use placeholder SVG
// — will swap over when user generates more variants.
// v1.7.13: switched .png -> .webp (754KB -> 74KB, 90% reduction).
// All modern browsers (Safari 14+, Chrome 32+, Firefox 65+) support WebP.
const kittenCh1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
  <image href="/mascots/calico-anchor.webp" x="0" y="0" width="100" height="140" preserveAspectRatio="xMidYMid meet"/>
</svg>`;

// ─── Kitten Ch2 — sitting straight observing baker, alert and curious ────
// Sitting tall, perky ears, head slightly tilted up, bread crumb context.
const kittenCh2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="k2-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="54" fill="url(#k2-halo)" opacity="0.88"/>
  <!-- Floating bread crumb sparkles (context — what she's watching) -->
  <g fill="#fcd34d" stroke="#92400e" stroke-width="1.5">
    <circle cx="14" cy="40" r="2.5"/>
    <circle cx="86" cy="44" r="2"/>
    <circle cx="12" cy="60" r="1.8"/>
  </g>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Sitting upright body (taller, narrower) -->
    <path d="M32 94 Q30 76 42 72 Q50 70 58 72 Q70 76 68 94 Q72 124 58 128 Q50 130 42 128 Q28 124 32 94 Z" fill="#fb923c" stroke-width="5"/>
    <!-- White belly -->
    <ellipse cx="50" cy="106" rx="12" ry="16" fill="#fef8ed" stroke="none"/>
    <!-- Front paws (sitting) -->
    <ellipse cx="42" cy="126" rx="4" ry="3" fill="#fb923c" stroke-width="3"/>
    <ellipse cx="58" cy="126" rx="4" ry="3" fill="#fb923c" stroke-width="3"/>
    <!-- Head (looking up, alert) -->
    <circle cx="50" cy="48" r="26" fill="#fb923c" stroke-width="5"/>
    <!-- Perky alert ears -->
    <path d="M30 34 L32 18 L42 36 Z" fill="#fb923c" stroke-width="4"/>
    <path d="M70 34 L68 18 L58 36 Z" fill="#fb923c" stroke-width="4"/>
    <!-- Inner ear pink -->
    <path d="M34 26 L36 34" stroke="#f4a8a8" stroke-width="2.5"/>
    <path d="M66 26 L64 34" stroke="#f4a8a8" stroke-width="2.5"/>
    <!-- Observant wide eyes (slightly upward gaze) -->
    <circle cx="40" cy="50" r="5.5" fill="#fef8ed" stroke-width="4"/>
    <circle cx="60" cy="50" r="5.5" fill="#fef8ed" stroke-width="4"/>
    <circle cx="40" cy="48" r="3.5" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="60" cy="48" r="3.5" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <circle cx="41" cy="47" r="1.2" fill="#fef8ed" stroke="none"/>
    <circle cx="61" cy="47" r="1.2" fill="#fef8ed" stroke="none"/>
    <!-- Cheek blush -->
    <circle cx="34" cy="58" r="3.5" fill="#f4a8a8" opacity="0.7" stroke="none"/>
    <circle cx="66" cy="58" r="3.5" fill="#f4a8a8" opacity="0.7" stroke="none"/>
    <!-- Nose -->
    <path d="M47 60 L53 60 L50 64 Z" fill="#f4a8a8" stroke-width="2"/>
    <!-- Small inquisitive mouth -->
    <path d="M46 68 Q50 70 54 68" fill="none" stroke-width="2.5"/>
    <!-- Whiskers -->
    <path d="M22 60 L36 62" stroke-width="1.8"/>
    <path d="M22 66 L36 66" stroke-width="1.8"/>
    <path d="M78 60 L64 62" stroke-width="1.8"/>
    <path d="M78 66 L64 66" stroke-width="1.8"/>
    <!-- Tail wrapped around -->
    <path d="M68 122 Q86 116 80 100" fill="none" stroke-width="4"/>
  </g>
</svg>`;

// ─── Kitten Ch3 — standing tall, tail up, confident first "no" ────────────
// Standing on all fours, head high, tail straight up like exclamation mark.
const kittenCh3 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="k3-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#bbf7d0"/>
      <stop offset="100%" stop-color="#4ade80"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="54" fill="url(#k3-halo)" opacity="0.88"/>
  <!-- Wind / determination lines context -->
  <g stroke="#fef8ed" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.85">
    <path d="M10 80 L20 80"/>
    <path d="M6 90 L18 90"/>
    <path d="M10 100 L20 100"/>
  </g>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Tail UP like exclamation mark (rendered first, behind body) -->
    <path d="M28 96 Q14 70 22 50" fill="none" stroke-width="6"/>
    <circle cx="22" cy="48" r="3" fill="#f97316" stroke-width="3"/>
    <!-- Body (standing on 4 legs) -->
    <path d="M28 96 Q30 80 42 76 Q50 74 58 76 Q70 80 72 96 Q72 116 58 118 Q50 120 42 118 Q28 116 28 96 Z" fill="#f97316" stroke-width="5"/>
    <!-- Legs -->
    <rect x="34" y="116" width="6" height="14" rx="2" fill="#f97316" stroke-width="4"/>
    <rect x="60" y="116" width="6" height="14" rx="2" fill="#f97316" stroke-width="4"/>
    <!-- White belly -->
    <ellipse cx="50" cy="102" rx="10" ry="10" fill="#fef8ed" stroke="none"/>
    <!-- Head held high (slight tilt up) -->
    <circle cx="50" cy="50" r="24" fill="#f97316" stroke-width="5"/>
    <!-- Pointy alert ears -->
    <path d="M30 38 L32 20 L42 40 Z" fill="#f97316" stroke-width="4"/>
    <path d="M70 38 L68 20 L58 40 Z" fill="#f97316" stroke-width="4"/>
    <path d="M34 26 L36 38" stroke="#f4a8a8" stroke-width="2.5"/>
    <path d="M66 26 L64 38" stroke="#f4a8a8" stroke-width="2.5"/>
    <!-- Determined narrow eyes -->
    <path d="M36 52 Q40 48 46 52" fill="none" stroke-width="3.5" class="mascot-eye"/>
    <path d="M54 52 Q60 48 64 52" fill="none" stroke-width="3.5" class="mascot-eye mascot-eye-right"/>
    <circle cx="41" cy="51" r="2" fill="#1a1a1a" class="mascot-pupil" stroke="none"/>
    <circle cx="59" cy="51" r="2" fill="#1a1a1a" class="mascot-pupil" stroke="none"/>
    <!-- Cheek blush -->
    <circle cx="32" cy="60" r="3.5" fill="#f4a8a8" opacity="0.7" stroke="none"/>
    <circle cx="68" cy="60" r="3.5" fill="#f4a8a8" opacity="0.7" stroke="none"/>
    <!-- Nose -->
    <path d="M47 62 L53 62 L50 66 Z" fill="#f4a8a8" stroke-width="2"/>
    <!-- Firm closed-line mouth (saying "no") -->
    <path d="M44 72 L56 72" fill="none" stroke-width="3"/>
    <!-- Whiskers -->
    <path d="M22 64 L36 66" stroke-width="1.8"/>
    <path d="M78 64 L64 66" stroke-width="1.8"/>
  </g>
</svg>`;

// ─── Kitten Ch4 — walking forward, one paw raised, learning street wisdom ──
// Stepping forward, paw lifted mid-step, tabby stripes, subtle scar.
const kittenCh4 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="k4-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="54" fill="url(#k4-halo)" opacity="0.85"/>
  <!-- Heart context (learning to love) -->
  <path d="M84 30 Q82 26 80 28 Q78 30 80 32 Q82 34 84 36 Q86 34 88 32 Q90 30 88 28 Q86 26 84 30 Z" fill="#ec4899" stroke="#1a1a1a" stroke-width="2"/>
  <!-- Footprint trail behind -->
  <g fill="#fef8ed" stroke="#1a1a1a" stroke-width="1.5" opacity="0.8">
    <ellipse cx="14" cy="120" rx="3" ry="2"/>
    <ellipse cx="20" cy="114" rx="2.5" ry="1.8"/>
  </g>
  <ellipse cx="50" cy="133" rx="24" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Walking body (slight forward lean) -->
    <path d="M30 100 Q28 82 40 76 Q50 72 60 76 Q72 82 70 100 Q74 122 60 126 Q50 128 40 126 Q26 122 30 100 Z" fill="#ea580c" stroke-width="5"/>
    <!-- White belly -->
    <ellipse cx="50" cy="108" rx="12" ry="14" fill="#fef8ed" stroke="none"/>
    <!-- Tabby stripes -->
    <path d="M36 90 Q38 86 36 82" fill="none" stroke="#9a3412" stroke-width="3"/>
    <path d="M64 90 Q62 86 64 82" fill="none" stroke="#9a3412" stroke-width="3"/>
    <path d="M38 102 Q40 100 38 96" fill="none" stroke="#9a3412" stroke-width="2.5"/>
    <path d="M62 102 Q60 100 62 96" fill="none" stroke="#9a3412" stroke-width="2.5"/>
    <!-- Back paw (planted) -->
    <ellipse cx="38" cy="128" rx="5" ry="3" fill="#ea580c" stroke-width="3"/>
    <!-- Front paw RAISED mid-step -->
    <ellipse cx="68" cy="116" rx="5" ry="4" fill="#ea580c" stroke-width="3"/>
    <path d="M68 112 L68 108" stroke-width="3" fill="none"/>
    <!-- Head -->
    <circle cx="50" cy="50" r="26" fill="#ea580c" stroke-width="5"/>
    <!-- Sharp pointy ears -->
    <path d="M28 36 L30 18 L42 38 Z" fill="#ea580c" stroke-width="4"/>
    <path d="M72 36 L70 18 L58 38 Z" fill="#ea580c" stroke-width="4"/>
    <path d="M33 24 L36 36" stroke="#f4a8a8" stroke-width="2.5"/>
    <path d="M67 24 L64 36" stroke="#f4a8a8" stroke-width="2.5"/>
    <!-- Forehead tabby M -->
    <path d="M44 36 L46 44" stroke="#9a3412" stroke-width="2.5"/>
    <path d="M50 34 L50 42" stroke="#9a3412" stroke-width="2.5"/>
    <path d="M56 36 L54 44" stroke="#9a3412" stroke-width="2.5"/>
    <!-- Soft confident eyes (slight curve) -->
    <ellipse cx="40" cy="54" rx="4.5" ry="3.5" fill="#fef8ed" stroke-width="3"/>
    <ellipse cx="60" cy="54" rx="4.5" ry="3.5" fill="#fef8ed" stroke-width="3"/>
    <circle cx="40" cy="54" r="2.5" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="60" cy="54" r="2.5" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <circle cx="41" cy="53" r="1" fill="#fef8ed" stroke="none"/>
    <circle cx="61" cy="53" r="1" fill="#fef8ed" stroke="none"/>
    <!-- Small scar on cheek -->
    <path d="M66 60 L70 64" stroke-width="2"/>
    <!-- Nose -->
    <path d="M47 62 L53 62 L50 66 Z" fill="#f4a8a8" stroke-width="2"/>
    <!-- Soft small smile (learning love) -->
    <path d="M44 72 Q50 75 56 72" fill="none" stroke-width="3"/>
    <!-- Whiskers -->
    <path d="M22 66 L36 68" stroke-width="1.8"/>
    <path d="M78 66 L64 68" stroke-width="1.8"/>
    <!-- Tail held mid-height (confident not stiff) -->
    <path d="M70 110 Q86 96 84 84" fill="none" stroke-width="4"/>
  </g>
</svg>`;

// ─── Kitten Ch5 — comfortable curl on pillow, eyes half-open, "Z" + heart ──
// Sleepy-content, "Z" floating, tiny heart, calico patches.
const kittenCh5 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="k5-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fce7f3"/>
      <stop offset="100%" stop-color="#f9a8d4"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="54" fill="url(#k5-halo)" opacity="0.9"/>
  <!-- Warm window glow lines (context — home warmth) -->
  <g stroke="#fcd34d" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7">
    <path d="M8 28 L20 18"/>
    <path d="M14 32 L24 22"/>
    <path d="M10 38 L22 28"/>
  </g>
  <!-- Heart floating (loved) -->
  <path d="M84 34 Q80 28 76 32 Q72 36 76 40 Q80 44 84 48 Q88 44 92 40 Q96 36 92 32 Q88 28 84 34 Z" fill="#ec4899" stroke="#1a1a1a" stroke-width="2.5"/>
  <ellipse cx="50" cy="133" rx="28" ry="2.5" fill="#1a1a1a" opacity="0.18"/>
  <!-- Pillow -->
  <g stroke="#1a1a1a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 118 Q30 110 50 114 Q70 110 90 118 Q90 130 70 132 Q50 134 30 132 Q10 130 10 118 Z" fill="#fde68a"/>
  </g>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Curled body (cream base) -->
    <ellipse cx="50" cy="98" rx="36" ry="22" fill="#fef8ed" stroke-width="5"/>
    <!-- Calico patches: orange left -->
    <path d="M20 96 Q22 80 38 82 Q42 92 32 102 Q22 102 20 96 Z" fill="#fb923c" stroke-width="3"/>
    <!-- Calico patches: brown right -->
    <path d="M68 100 Q82 96 82 110 Q72 116 64 110 Q62 104 68 100 Z" fill="#92400e" stroke-width="3"/>
    <!-- Curled tail wrapping around -->
    <path d="M16 102 Q4 90 18 80 Q34 80 34 92" fill="none" stroke-width="4"/>
    <!-- Head on pillow (tilted right, resting) -->
    <circle cx="58" cy="72" r="22" fill="#fef8ed" stroke-width="5"/>
    <!-- Calico patch on head (orange) -->
    <path d="M40 70 Q40 58 52 58 Q56 62 54 70 Q48 74 40 70 Z" fill="#fb923c" stroke-width="3"/>
    <!-- Calico patch on head (brown) -->
    <path d="M64 62 Q74 60 76 70 Q72 76 66 74 Q62 68 64 62 Z" fill="#92400e" stroke-width="3"/>
    <!-- Folded relaxed ears -->
    <path d="M44 58 Q44 48 50 50 Q54 54 52 60 Z" fill="#fb923c" stroke-width="3.5"/>
    <path d="M72 58 Q72 48 66 50 Q62 54 64 60 Z" fill="#92400e" stroke-width="3.5"/>
    <!-- Half-open content eyes (in-between sleeping/awake) -->
    <path d="M48 72 Q52 75 56 72" fill="none" stroke-width="3" class="mascot-eye"/>
    <path d="M62 72 Q66 75 70 72" fill="none" stroke-width="3" class="mascot-eye mascot-eye-right"/>
    <!-- Cheek blush (strong — happy) -->
    <circle cx="46" cy="80" r="3.5" fill="#f4a8a8" opacity="0.85" stroke="none"/>
    <circle cx="72" cy="80" r="3.5" fill="#f4a8a8" opacity="0.85" stroke="none"/>
    <!-- Nose -->
    <path d="M56 82 L62 82 L59 86 Z" fill="#f4a8a8" stroke-width="2"/>
    <!-- Content smile -->
    <path d="M54 90 Q59 93 64 90" fill="none" stroke-width="3"/>
    <!-- Whiskers -->
    <path d="M40 80 L52 82" stroke-width="1.8"/>
    <path d="M66 86 L78 82" stroke-width="1.8"/>
  </g>
  <!-- Sleeping Zs -->
  <g fill="#1a1a1a" stroke="none" font-family="system-ui, sans-serif" font-weight="900">
    <text x="80" y="62" font-size="11">z</text>
    <text x="86" y="50" font-size="16">Z</text>
  </g>
</svg>`;

// ─── Story NPCs ──────────────────────────────────────────────────────────────

// Ch1 — Grandma holding umbrella overhead, sheltering, rain droplets context.
const npcGrandma = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="gm-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fcd34d"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="80" r="52" fill="url(#gm-halo)" opacity="0.88"/>
  <!-- Rain droplets falling around umbrella (context) -->
  <g fill="#3b82f6" stroke="none" opacity="0.75">
    <ellipse cx="10" cy="56" rx="1.5" ry="3"/>
    <ellipse cx="18" cy="40" rx="1.5" ry="3"/>
    <ellipse cx="82" cy="40" rx="1.5" ry="3"/>
    <ellipse cx="90" cy="56" rx="1.5" ry="3"/>
    <ellipse cx="6" cy="80" rx="1.2" ry="2.6"/>
    <ellipse cx="94" cy="80" rx="1.2" ry="2.6"/>
  </g>
  <ellipse cx="50" cy="133" rx="26" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <g stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Umbrella (dusty rose, big & arched overhead) -->
    <path d="M10 42 Q50 8 90 42 Q70 38 50 42 Q30 38 10 42 Z" fill="#e8a3a3" stroke-width="5"/>
    <!-- Umbrella spokes -->
    <path d="M30 42 L30 38" stroke-width="2.5" fill="none"/>
    <path d="M50 42 L50 14" stroke-width="2.5" fill="none"/>
    <path d="M70 42 L70 38" stroke-width="2.5" fill="none"/>
    <!-- Umbrella shaft -->
    <path d="M50 42 L50 76" fill="none" stroke-width="3"/>
    <!-- Umbrella handle (J-curve) -->
    <path d="M48 76 Q50 84 58 80" fill="none" stroke-width="3"/>
  </g>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Body / shawl (dusty rose) -->
    <path d="M26 96 Q36 90 50 90 Q64 90 74 96 L78 132 L22 132 Z" fill="#e8a3a3" stroke-width="5"/>
    <!-- Cardigan buttons -->
    <circle cx="50" cy="104" r="1.8" fill="#1a1a1a" stroke="none"/>
    <circle cx="50" cy="116" r="1.8" fill="#1a1a1a" stroke="none"/>
    <circle cx="50" cy="128" r="1.8" fill="#1a1a1a" stroke="none"/>
    <!-- Head -->
    <circle cx="50" cy="70" r="22" fill="#fde4c8" stroke-width="5"/>
    <!-- White bun hair -->
    <path d="M30 60 Q34 50 50 50 Q66 50 70 60 Q60 56 50 58 Q40 56 30 60 Z" fill="#e2e8f0" stroke-width="4"/>
    <circle cx="50" cy="48" r="7" fill="#e2e8f0" stroke-width="3.5"/>
    <!-- Closed gentle eyes -->
    <path d="M40 70 Q42 74 44 70" fill="none" stroke-width="3" class="mascot-eye"/>
    <path d="M56 70 Q58 74 60 70" fill="none" stroke-width="3" class="mascot-eye mascot-eye-right"/>
    <!-- Strong cheek blush -->
    <circle cx="36" cy="76" r="3.2" fill="#f4a8a8" opacity="0.9" stroke="none"/>
    <circle cx="64" cy="76" r="3.2" fill="#f4a8a8" opacity="0.9" stroke="none"/>
    <!-- Gentle smile -->
    <path d="M44 82 Q50 86 56 82" fill="none" stroke-width="3"/>
    <!-- Cane -->
    <path d="M82 100 Q86 96 88 100 L88 132" fill="none" stroke-width="3.5"/>
  </g>
</svg>`;

// Ch2 — Baker holding fresh bread roll, flour-dust puffs, "★" on chef hat.
const npcBaker = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="bk-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="52" fill="url(#bk-halo)" opacity="0.88"/>
  <!-- Flour puff dots context -->
  <g fill="#fef8ed" stroke="#1a1a1a" stroke-width="1" opacity="0.85">
    <circle cx="14" cy="48" r="3"/>
    <circle cx="10" cy="56" r="2"/>
    <circle cx="86" cy="52" r="2.5"/>
    <circle cx="90" cy="62" r="1.8"/>
    <circle cx="88" cy="92" r="2"/>
  </g>
  <ellipse cx="50" cy="133" rx="26" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Body / shirt -->
    <path d="M22 88 Q26 76 50 76 Q74 76 78 88 L80 132 L20 132 Z" fill="#fef8ed" stroke-width="5"/>
    <!-- Tan apron -->
    <path d="M32 92 L68 92 L70 132 L30 132 Z" fill="#d4a574" stroke-width="4"/>
    <!-- Apron tie -->
    <path d="M44 92 Q50 86 56 92" fill="none" stroke-width="3"/>
    <!-- Head -->
    <circle cx="50" cy="52" r="22" fill="#fde4c8" stroke-width="5"/>
    <!-- Chef hat (white mushroom, taller) -->
    <ellipse cx="50" cy="26" rx="22" ry="13" fill="#fef8ed" stroke-width="4"/>
    <rect x="34" y="34" width="32" height="10" fill="#fef8ed" stroke-width="3"/>
    <!-- Star on hat (signature mastery badge) -->
    <path d="M50 22 L51.5 25 L55 25.5 L52.5 28 L53 31.5 L50 30 L47 31.5 L47.5 28 L45 25.5 L48.5 25 Z" fill="#fcd34d" stroke-width="1.5"/>
    <!-- Bushy moustache -->
    <path d="M38 62 Q44 66 50 64 Q56 66 62 62 Q58 70 50 68 Q42 70 38 62 Z" fill="#1a1a1a" stroke-width="3"/>
    <!-- Crescent happy eyes -->
    <path d="M40 50 Q44 54 48 50" fill="none" stroke-width="3.5" class="mascot-eye"/>
    <path d="M52 50 Q56 54 60 50" fill="none" stroke-width="3.5" class="mascot-eye mascot-eye-right"/>
    <!-- Cheek blush -->
    <circle cx="34" cy="58" r="3.2" fill="#f4a8a8" opacity="0.8" stroke="none"/>
    <circle cx="66" cy="58" r="3.2" fill="#f4a8a8" opacity="0.8" stroke="none"/>
    <!-- HAND HOLDING bread roll up (offering pose) -->
    <path d="M68 96 Q78 88 76 78" fill="none" stroke-width="5"/>
    <!-- Bread roll (golden amber, presented) -->
    <ellipse cx="76" cy="74" rx="11" ry="7" fill="#fcd34d" stroke-width="4"/>
    <path d="M70 72 L72 76" fill="none" stroke-width="2"/>
    <path d="M76 70 L78 74" fill="none" stroke-width="2"/>
    <path d="M82 72 L84 76" fill="none" stroke-width="2"/>
  </g>
</svg>`;

// Ch3 — Mei-mei arms outstretched welcome-hug pose, pink dress + treat bag.
const npcMeimei = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="mm-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fce7f3"/>
      <stop offset="100%" stop-color="#f9a8d4"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="52" fill="url(#mm-halo)" opacity="0.92"/>
  <!-- Hearts context (loving child) -->
  <g fill="#ec4899" stroke="#1a1a1a" stroke-width="1.5">
    <path d="M14 30 Q12 26 10 28 Q8 30 10 32 Q12 34 14 36 Q16 34 18 32 Q20 30 18 28 Q16 26 14 30 Z"/>
    <path d="M86 30 Q84 26 82 28 Q80 30 82 32 Q84 34 86 36 Q88 34 90 32 Q92 30 90 28 Q88 26 86 30 Z"/>
  </g>
  <ellipse cx="50" cy="133" rx="26" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Pink dress -->
    <path d="M28 88 Q36 82 50 82 Q64 82 72 88 L80 132 L20 132 Z" fill="#ec4899" stroke-width="5"/>
    <!-- Dress collar -->
    <path d="M42 86 Q50 92 58 86" fill="none" stroke-width="3"/>
    <!-- Outstretched arms (welcome hug pose) -->
    <path d="M28 90 Q14 96 8 86" fill="none" stroke-width="5"/>
    <path d="M72 90 Q86 96 92 86" fill="none" stroke-width="5"/>
    <circle cx="8" cy="86" r="4" fill="#fde4c8" stroke-width="3"/>
    <circle cx="92" cy="86" r="4" fill="#fde4c8" stroke-width="3"/>
    <!-- Head -->
    <circle cx="50" cy="54" r="22" fill="#fde4c8" stroke-width="5"/>
    <!-- Hair bangs -->
    <path d="M30 52 Q34 36 50 36 Q66 36 70 52 Q60 46 50 48 Q40 46 30 52 Z" fill="#3d2817" stroke-width="4"/>
    <!-- Side ponytail -->
    <path d="M68 54 Q84 56 86 70 Q82 74 76 70 Q70 64 68 58 Z" fill="#3d2817" stroke-width="4"/>
    <!-- Ponytail tie (yellow) -->
    <circle cx="74" cy="58" r="3.5" fill="#fcd34d" stroke-width="2"/>
    <!-- Big shy round eyes -->
    <circle cx="42" cy="54" r="5" fill="#fef8ed" stroke-width="3.5"/>
    <circle cx="58" cy="54" r="5" fill="#fef8ed" stroke-width="3.5"/>
    <circle cx="42" cy="55" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
    <circle cx="58" cy="55" r="3.2" fill="#1a1a1a" class="mascot-pupil mascot-eye mascot-eye-right" stroke="none"/>
    <circle cx="43" cy="54" r="1.2" fill="#fef8ed" stroke="none"/>
    <circle cx="59" cy="54" r="1.2" fill="#fef8ed" stroke="none"/>
    <!-- Strong cheek blush -->
    <circle cx="36" cy="64" r="3.8" fill="#f4a8a8" opacity="0.92" stroke="none"/>
    <circle cx="64" cy="64" r="3.8" fill="#f4a8a8" opacity="0.92" stroke="none"/>
    <!-- Big open-mouth happy smile -->
    <path d="M44 70 Q50 76 56 70" fill="#dc2626" stroke-width="2.5"/>
    <!-- Treat bag at feet (cream + amber treats) -->
    <rect x="38" y="108" width="24" height="20" rx="3" fill="#fef8ed" stroke-width="4"/>
    <!-- "Cat food" label -->
    <ellipse cx="50" cy="113" rx="6" ry="3" fill="#fb923c" stroke-width="2"/>
    <circle cx="44" cy="120" r="1.5" fill="#fb923c" stroke="none"/>
    <circle cx="50" cy="122" r="1.5" fill="#fb923c" stroke="none"/>
    <circle cx="56" cy="120" r="1.5" fill="#fb923c" stroke="none"/>
  </g>
</svg>`;

// Ch4 — Brutus head-cocked attentive, one-eyed, scruffy fur, bone context.
const npcBrutus = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="br-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#bbf7d0"/>
      <stop offset="100%" stop-color="#22c55e"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="54" fill="url(#br-halo)" opacity="0.82"/>
  <!-- Bone context (alpha dog) -->
  <g fill="#fef8ed" stroke="#1a1a1a" stroke-width="2">
    <path d="M82 30 Q88 26 90 30 Q88 32 86 34 Q88 36 90 38 Q88 42 82 38 Q78 36 76 34 Q78 32 82 30 Z"/>
  </g>
  <!-- Paw print context -->
  <g fill="#1a1a1a" stroke="none" opacity="0.55">
    <circle cx="12" cy="36" r="2"/>
    <circle cx="9" cy="32" r="1"/>
    <circle cx="15" cy="32" r="1"/>
    <circle cx="9" cy="40" r="1"/>
    <circle cx="15" cy="40" r="1"/>
  </g>
  <ellipse cx="50" cy="133" rx="28" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Body (brown) -->
    <path d="M22 96 Q18 78 36 70 Q50 66 64 70 Q82 78 78 96 Q82 122 64 128 Q50 130 36 128 Q18 122 22 96 Z" fill="#92400e" stroke-width="5"/>
    <!-- Tan belly -->
    <ellipse cx="50" cy="106" rx="16" ry="16" fill="#d4a574" stroke="none"/>
    <!-- Head COCKED to side (transform rotate for tilt) -->
    <g transform="rotate(-12 50 52)">
      <circle cx="50" cy="52" r="26" fill="#92400e" stroke-width="5"/>
      <!-- Floppy ears -->
      <path d="M24 50 Q14 76 30 80 Q34 70 32 54 Z" fill="#6b4a2a" stroke-width="4"/>
      <path d="M76 50 Q86 76 70 80 Q66 70 68 54 Z" fill="#6b4a2a" stroke-width="4"/>
      <!-- Snout -->
      <ellipse cx="50" cy="64" rx="14" ry="12" fill="#d4a574" stroke-width="4"/>
      <!-- Nose -->
      <ellipse cx="50" cy="60" rx="4.5" ry="3.5" fill="#1a1a1a" stroke-width="3"/>
      <!-- Mouth -->
      <path d="M44 70 Q50 74 56 70" fill="none" stroke-width="3"/>
      <path d="M50 70 L50 74" fill="none" stroke-width="2.5"/>
      <!-- Good eye -->
      <circle cx="40" cy="48" r="4.5" fill="#fef8ed" stroke-width="3.5"/>
      <circle cx="40" cy="49" r="2.8" fill="#1a1a1a" class="mascot-pupil mascot-eye" stroke="none"/>
      <circle cx="41" cy="48" r="1" fill="#fef8ed" stroke="none"/>
      <!-- Scarred eye X -->
      <path d="M56 44 L64 52" stroke-width="3.5"/>
      <path d="M64 44 L56 52" stroke-width="3.5"/>
      <!-- Cheek scar -->
      <path d="M40 32 L46 38" stroke-width="2.5"/>
    </g>
    <!-- Scruffy fur tufts (outside rotation) -->
    <path d="M28 86 L24 92 L30 92 Z" fill="#6b4a2a" stroke-width="3"/>
    <path d="M72 86 L76 92 L70 92 Z" fill="#6b4a2a" stroke-width="3"/>
    <!-- Tail wagging up (attentive friendly) -->
    <path d="M74 110 Q92 96 86 80" fill="none" stroke-width="4"/>
  </g>
</svg>`;

// Ch5 — Family huddled trio (close together), heart above, shared blanket.
const npcFamily = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" aria-hidden="true">
  <defs>
    <radialGradient id="fm-halo" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#fb923c"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="76" r="54" fill="url(#fm-halo)" opacity="0.85"/>
  <!-- Sparkles context (warm family moment) -->
  <g fill="#fef8ed" stroke="none">
    <path d="M12 24 L13.5 27 L16.5 28 L13.5 29 L12 32 L10.5 29 L7.5 28 L10.5 27 Z"/>
    <path d="M90 28 L91 30 L93 30.5 L91 31 L90 33 L89 31 L87 30.5 L89 30 Z"/>
  </g>
  <ellipse cx="50" cy="134" rx="42" ry="2.5" fill="#1a1a1a" opacity="0.2"/>
  <!-- Shared blanket behind them (warm tan, ground line) -->
  <path d="M6 124 Q50 118 94 124 L94 132 L6 132 Z" fill="#d4a574" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="mascot-body" stroke="#1a1a1a" stroke-linecap="round" stroke-linejoin="round">
    <!-- Heart above (signature unity) -->
    <path d="M50 22 Q46 14 40 18 Q34 22 38 28 Q44 34 50 40 Q56 34 62 28 Q66 22 60 18 Q54 14 50 22 Z" fill="#ec4899" stroke-width="4"/>

    <!-- Dad (left) — pulled closer to center -->
    <circle cx="26" cy="64" r="14" fill="#fde4c8" stroke-width="4"/>
    <path d="M14 60 Q16 50 26 50 Q36 50 38 60 Q34 56 26 56 Q18 56 14 60 Z" fill="#1a1a1a" stroke-width="3"/>
    <path d="M14 84 Q18 76 26 76 Q40 76 42 84 L42 124 L12 124 Z" fill="#fb923c" stroke-width="4"/>
    <circle cx="22" cy="64" r="1.8" fill="#1a1a1a" class="mascot-eye" stroke="none"/>
    <circle cx="30" cy="64" r="1.8" fill="#1a1a1a" class="mascot-eye mascot-eye-right" stroke="none"/>
    <path d="M22 70 Q26 72 30 70" fill="none" stroke-width="2.5"/>
    <circle cx="18" cy="68" r="2.2" fill="#f4a8a8" opacity="0.8" stroke="none"/>
    <circle cx="34" cy="68" r="2.2" fill="#f4a8a8" opacity="0.8" stroke="none"/>

    <!-- Mom (right) — pulled closer -->
    <circle cx="74" cy="64" r="14" fill="#fde4c8" stroke-width="4"/>
    <path d="M60 60 Q62 48 74 48 Q86 50 86 62 Q84 70 80 74 Q78 68 74 68 Q70 68 68 74 Q62 70 60 60 Z" fill="#6b4a2a" stroke-width="3"/>
    <path d="M58 84 Q62 76 74 76 Q86 76 88 84 L88 124 L58 124 Z" fill="#ec4899" stroke-width="4"/>
    <path d="M68 64 Q70 66 72 64" fill="none" stroke-width="2.5" class="mascot-eye"/>
    <path d="M76 64 Q78 66 80 64" fill="none" stroke-width="2.5" class="mascot-eye mascot-eye-right"/>
    <path d="M70 70 Q74 72 78 70" fill="none" stroke-width="2.5"/>
    <circle cx="66" cy="68" r="2.2" fill="#f4a8a8" opacity="0.85" stroke="none"/>
    <circle cx="82" cy="68" r="2.2" fill="#f4a8a8" opacity="0.85" stroke="none"/>

    <!-- Mei-mei (center, between parents — huddle) -->
    <circle cx="50" cy="82" r="12" fill="#fde4c8" stroke-width="4"/>
    <path d="M40 80 Q42 70 50 70 Q58 70 60 80 Q54 76 50 78 Q46 76 40 80 Z" fill="#3d2817" stroke-width="3"/>
    <circle cx="60" cy="78" r="3" fill="#3d2817" stroke-width="2.5"/>
    <path d="M42 100 Q46 96 50 96 Q54 96 58 100 L58 124 L42 124 Z" fill="#ec4899" stroke-width="4"/>
    <circle cx="46" cy="82" r="1.5" fill="#1a1a1a" class="mascot-eye" stroke="none"/>
    <circle cx="54" cy="82" r="1.5" fill="#1a1a1a" class="mascot-eye mascot-eye-right" stroke="none"/>
    <path d="M46 86 Q50 88 54 86" fill="none" stroke-width="2.2"/>
    <circle cx="43" cy="85" r="1.8" fill="#f4a8a8" opacity="0.85" stroke="none"/>
    <circle cx="57" cy="85" r="1.8" fill="#f4a8a8" opacity="0.85" stroke="none"/>

    <!-- Connecting arms (huddle effect) -->
    <path d="M38 92 Q44 96 50 96" fill="none" stroke-width="4"/>
    <path d="M62 92 Q56 96 50 96" fill="none" stroke-width="4"/>
  </g>
</svg>`;

export const MASCOTS: Record<string, MascotDef> = {
  owl: { id: 'owl', svg: owl },
  waiter: { id: 'waiter', svg: waiter },
  flightAttendant: { id: 'flightAttendant', svg: flightAttendant },
  doctor: { id: 'doctor', svg: doctor },
  coworker: { id: 'coworker', svg: coworker },
  receptionist: { id: 'receptionist', svg: receptionist },
  // story mode — kitten states
  kittenCh1: { id: 'kittenCh1', svg: kittenCh1 },
  kittenCh2: { id: 'kittenCh2', svg: kittenCh2 },
  kittenCh3: { id: 'kittenCh3', svg: kittenCh3 },
  kittenCh4: { id: 'kittenCh4', svg: kittenCh4 },
  kittenCh5: { id: 'kittenCh5', svg: kittenCh5 },
  // story mode — NPCs
  npcGrandma: { id: 'npcGrandma', svg: npcGrandma },
  npcBaker: { id: 'npcBaker', svg: npcBaker },
  npcMeimei: { id: 'npcMeimei', svg: npcMeimei },
  npcBrutus: { id: 'npcBrutus', svg: npcBrutus },
  npcFamily: { id: 'npcFamily', svg: npcFamily },
};

export function getMascotSvg(id: string): string {
  return (MASCOTS[id] ?? MASCOTS.owl).svg;
}
