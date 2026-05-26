/**
 * NodeActivitySheet — v1.7.11 bottom-sheet popup that opens when the
 * player taps a story map node. Inspired by Duolingo's per-node
 * "Listening Practice +XP / Reading Practice +XP" menu (user reference
 * screenshot 2026-05-26).
 *
 * Two CTAs:
 *   🎧 Listening Practice — +20 XP (sets listeningMode=true)
 *   📖 Reading Practice   — +15 XP (default reading)
 *
 * Tap outside the sheet dismisses without starting anything.
 */

import { applyStyle } from './domUtil';
import { speak } from '../audio/tts';

export interface NodeActivityHandlers {
  onListening: () => void;
  onReading: () => void;
  onDismiss: () => void;
}

const COLOR_ACCENT = '#3d8aae';      // listening = soft blue (TTS audio vibe)
const COLOR_ACCENT_DARK = '#2c6986';
const COLOR_AMBER = '#e7a44a';        // reading = brand amber
const COLOR_AMBER_DARK = '#b07a2a';
const COLOR_TEXT_DARK = '#3c2a1c';
const COLOR_TEXT_MUTED = '#7a6850';

export class NodeActivitySheet {
  private backdrop: HTMLDivElement;
  private sheet: HTMLDivElement;
  private handlers: NodeActivityHandlers;

  constructor(opts: { sectionLabel: string; questionLabel: string } & NodeActivityHandlers) {
    this.handlers = {
      onListening: opts.onListening,
      onReading: opts.onReading,
      onDismiss: opts.onDismiss,
    };

    // Backdrop dims the map behind. Tap = dismiss.
    this.backdrop = document.createElement('div');
    applyStyle(this.backdrop, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(28, 18, 8, 0.45)',
      zIndex: '60',
      animation: 'pickup-fade-in 180ms ease-out forwards',
      opacity: '0',
    });
    this.backdrop.addEventListener('click', (e) => {
      // Only dismiss if click is on backdrop itself, not the sheet inside
      if (e.target === this.backdrop) this.dismiss();
    });

    // Sheet — bottom anchored card with two big CTAs
    this.sheet = document.createElement('div');
    applyStyle(this.sheet, {
      position: 'fixed',
      left: '50%',
      bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 80px))',
      transform: 'translateX(-50%)',
      width: 'min(380px, calc(100vw - 32px))',
      background: '#ffffff',
      borderRadius: '22px',
      padding: '18px 18px 16px',
      boxShadow: '0 -10px 30px rgba(28, 18, 8, 0.18), 0 8px 0 #d4c098',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: '61',
      fontFamily: '"Nunito", "Noto Sans TC", system-ui, sans-serif',
      animation: 'pickup-sheet-slide-up 260ms cubic-bezier(0.2, 0.8, 0.3, 1.1) forwards',
      opacity: '0',
    });

    // Header: section + question label
    const head = document.createElement('div');
    head.innerHTML = `
      <div style="font-size:10px;font-weight:800;letter-spacing:1.4px;color:${COLOR_TEXT_MUTED};text-transform:uppercase;">
        ${opts.sectionLabel}
      </div>
      <div style="font-size:17px;font-weight:900;color:${COLOR_TEXT_DARK};line-height:1.2;margin-top:2px;">
        ${opts.questionLabel}
      </div>
    `;
    this.sheet.appendChild(head);

    // Listening CTA
    this.sheet.appendChild(this.makeActivityButton({
      emoji: '🎧',
      label: 'Listening Practice',
      sub: '+20 XP · hear the sentence and choose',
      bg: COLOR_ACCENT,
      bgDark: COLOR_ACCENT_DARK,
      onClick: () => {
        // v1.7.13 iOS TTS unlock: speechSynthesis is blocked on iOS
        // Safari until first invoked DURING a user gesture. We fire a
        // silent warm-up speak() right here in the click handler so
        // subsequent speak() calls in PlayScene (which happen via
        // setTimeout, well after the gesture) work.
        speak(' ', 'en-US');
        this.dismiss();
        this.handlers.onListening();
      },
    }));

    // Reading CTA
    this.sheet.appendChild(this.makeActivityButton({
      emoji: '📖',
      label: 'Reading Practice',
      sub: '+15 XP · read the sentence and choose',
      bg: COLOR_AMBER,
      bgDark: COLOR_AMBER_DARK,
      onClick: () => {
        this.dismiss();
        this.handlers.onReading();
      },
    }));

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.sheet);

    // Inject keyframes if missing (idempotent — only on first sheet open)
    this.ensureKeyframes();

    // Trigger fade-in
    requestAnimationFrame(() => {
      this.backdrop.style.opacity = '1';
      this.sheet.style.opacity = '1';
    });
  }

  private makeActivityButton(opts: {
    emoji: string;
    label: string;
    sub: string;
    bg: string;
    bgDark: string;
    onClick: () => void;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    applyStyle(btn, {
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      borderRadius: '16px',
      background: opts.bg,
      color: '#ffffff',
      border: 'none',
      borderBottom: `4px solid ${opts.bgDark}`,
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'inherit',
      transition: 'transform 80ms ease-out, border-bottom-width 80ms ease-out',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });
    btn.innerHTML = `
      <div style="font-size:24px;line-height:1;">${opts.emoji}</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:900;">${opts.label}</div>
        <div style="font-size:11px;font-weight:700;opacity:0.85;margin-top:2px;">${opts.sub}</div>
      </div>
      <div style="font-size:22px;font-weight:900;opacity:0.85;">→</div>
    `;
    // Press-down feedback
    const press = () => {
      btn.style.transform = 'translateY(3px)';
      btn.style.borderBottomWidth = '1px';
    };
    const release = () => {
      btn.style.transform = '';
      btn.style.borderBottomWidth = '4px';
    };
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
    btn.addEventListener('touchstart', press, { passive: true });
    btn.addEventListener('touchend', release);
    btn.addEventListener('touchcancel', release);
    btn.addEventListener('click', (e) => { e.preventDefault(); opts.onClick(); });
    return btn;
  }

  private ensureKeyframes(): void {
    if (document.getElementById('pickup-sheet-kf')) return;
    const style = document.createElement('style');
    style.id = 'pickup-sheet-kf';
    style.textContent = `
      @keyframes pickup-fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes pickup-sheet-slide-up {
        from { opacity: 0; transform: translateX(-50%) translateY(40px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  dismiss(): void {
    this.backdrop.remove();
    this.sheet.remove();
    this.handlers.onDismiss();
  }
}
