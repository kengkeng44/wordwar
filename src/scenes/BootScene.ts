import Phaser from 'phaser';
import { getMascotSvg } from '../ui/mascots';
import { useRunStore } from '../store/runStore';
import type { Difficulty } from '../data/sentences';

/**
 * BootScene — v0.13 minimal splash / cover page.
 *
 * Design intent (per user feedback on v0.12):
 *   - Strip all explanatory text. Whitespace > microcopy.
 *   - Center every element (title, mascot, CTA, difficulty).
 *   - Move difficulty here from ModeMenu, as a quiet collapsible
 *     under the "開始" CTA. Default state: small one-liner
 *     `難度 · 中等 ⌄`. Tap to expand, pick to collapse.
 *   - Visual hierarchy: 開始 dominates, 難度 recedes.
 *
 * The collapsible uses a native <details> element with custom CSS,
 * so no JS framework / animation library is needed.
 */

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export class BootScene extends Phaser.Scene {
  private overlay?: HTMLDivElement;

  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');
    this.mountOverlay();

    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      this.overlay?.remove();
      this.overlay = undefined;
      this.scene.start('MenuScene');
    };

    // CTA — explicit single button. NO anywhere-tap fallback in v0.13:
    // the difficulty <details> now needs taps to expand without leaking
    // through to advance().
    const cta = this.overlay?.querySelector<HTMLButtonElement>(
      '.pickup-splash-cta'
    );
    cta?.addEventListener('click', (e) => {
      e.preventDefault();
      advance();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.overlay?.remove();
      this.overlay = undefined;
    });
  }

  private mountOverlay(): void {
    const root = document.createElement('div');
    root.id = 'pickup-splash';

    // Mascot (top — no tagline above it for minimalism).
    const mascot = document.createElement('div');
    mascot.className = 'pickup-splash-mascot';
    mascot.innerHTML = getMascotSvg('owl');
    root.appendChild(mascot);

    // Title — single big amber wordmark, centered.
    const title = document.createElement('h1');
    title.className = 'pickup-splash-title';
    title.textContent = 'Pickup';
    root.appendChild(title);

    // Subtitle — tagline directly under the wordmark.
    const subtitle = document.createElement('div');
    subtitle.className = 'pickup-splash-subtitle';
    subtitle.textContent = 'Pick up moments. Learn English.';
    root.appendChild(subtitle);

    // CTA — primary action, large.
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'pickup-splash-cta';
    cta.textContent = 'Start';
    root.appendChild(cta);

    // Difficulty — collapsible, much smaller than CTA.
    root.appendChild(this.makeDifficultyCollapsible());

    // Tiny version footer
    const footer = document.createElement('div');
    footer.className = 'pickup-splash-footer';
    footer.textContent = `v1.2.0`;
    root.appendChild(footer);

    document.body.appendChild(root);
    this.overlay = root;
  }

  /**
   * Native <details>/<summary> collapsible. Summary shows the current
   * difficulty inline. Tapping reveals three centered options. Selecting
   * one persists it + collapses + updates the summary label.
   */
  private makeDifficultyCollapsible(): HTMLElement {
    const details = document.createElement('details');
    details.className = 'pickup-difficulty';

    // First-time UX: if the user has never seen the difficulty picker,
    // start it expanded with a one-time inline microcopy nudge. On the
    // first close we persist a flag and never auto-open again.
    let firstTimeHint: HTMLDivElement | null = null;
    let seen = false;
    try {
      seen = localStorage.getItem('pickup.difficulty-seen') === '1';
    } catch {
      // ignore
    }
    if (!seen) {
      details.open = true;
    }

    const summary = document.createElement('summary');
    summary.className = 'pickup-difficulty-summary';
    const current = useRunStore.getState().difficulty;
    summary.innerHTML = `<span class="pickup-difficulty-label">Difficulty · <span class="pickup-difficulty-current">${DIFFICULTY_LABELS[current]}</span></span><span class="pickup-difficulty-caret">⌄</span>`;
    details.appendChild(summary);

    if (!seen) {
      firstTimeHint = document.createElement('div');
      firstTimeHint.className = 'pickup-difficulty-hint';
      firstTimeHint.textContent = 'Pick your level first';
      details.appendChild(firstTimeHint);
    }

    const markSeen = () => {
      if (seen) return;
      seen = true;
      try {
        localStorage.setItem('pickup.difficulty-seen', '1');
      } catch {
        // ignore
      }
      firstTimeHint?.remove();
      firstTimeHint = null;
    };

    // Detect first close (user dismissed / selected) → write 'seen'.
    details.addEventListener('toggle', () => {
      if (!details.open) {
        markSeen();
      }
    });

    const opts = document.createElement('div');
    opts.className = 'pickup-difficulty-opts';

    const tiers: Difficulty[] = ['easy', 'medium', 'hard'];
    const buttons = new Map<Difficulty, HTMLButtonElement>();

    const paint = (active: Difficulty) => {
      for (const [id, el] of buttons) {
        el.classList.toggle('is-active', id === active);
      }
      const cur = summary.querySelector('.pickup-difficulty-current');
      if (cur) cur.textContent = DIFFICULTY_LABELS[active];
    };

    for (const tier of tiers) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pickup-difficulty-opt';
      btn.dataset.difficulty = tier;
      btn.textContent = DIFFICULTY_LABELS[tier];
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        useRunStore.getState().setDifficulty(tier);
        paint(tier);
        // Auto-collapse after a brief moment so the user sees the new state.
        window.setTimeout(() => {
          details.open = false;
        }, 140);
      });
      buttons.set(tier, btn);
      opts.appendChild(btn);
    }
    paint(current);
    details.appendChild(opts);

    return details;
  }
}
