import Phaser from 'phaser';
import { applyStyle } from '../ui/domUtil';

/**
 * BootScene — splash screen (v0.4 Duolingo aesthetic).
 *
 * All text is DOM-rendered so it stays crisp at high DPR. Phaser only
 * owns the background color and the auto-advance timer.
 */
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

    this.time.delayedCall(1500, advance);
    this.input.once('pointerdown', advance);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.overlay?.remove();
      this.overlay = undefined;
    });
  }

  private mountOverlay(): void {
    const root = document.createElement('div');
    root.id = 'boot-overlay';
    applyStyle(root, {
      position: 'fixed',
      inset: '0',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '14px',
      zIndex: '15',
      fontFamily:
        '"Nunito", "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#3c3c3c',
      cursor: 'pointer',
    });

    const title = document.createElement('div');
    title.textContent = 'WordWar';
    applyStyle(title, {
      fontSize: '52px',
      fontWeight: '900',
      letterSpacing: '-1px',
      color: '#58cc02',
    });
    root.appendChild(title);

    const sub = document.createElement('div');
    sub.textContent = 'CEFR cloze · 填空挑戰';
    applyStyle(sub, {
      fontSize: '16px',
      fontWeight: '600',
      color: '#777777',
    });
    root.appendChild(sub);

    const tap = document.createElement('div');
    tap.textContent = 'Tap to start';
    applyStyle(tap, {
      marginTop: '28px',
      fontSize: '14px',
      fontWeight: '800',
      color: '#1cb0f6',
      letterSpacing: '0.5px',
      textTransform: 'uppercase',
      animation: 'wordwar-blink 0.9s ease-in-out infinite alternate',
    });
    root.appendChild(tap);

    const footer = document.createElement('div');
    footer.textContent = `v0.4.0 · Phaser ${Phaser.VERSION}`;
    applyStyle(footer, {
      position: 'absolute',
      bottom: 'max(20px, env(safe-area-inset-bottom))',
      fontSize: '11px',
      color: '#a8a2b3',
      fontFamily:
        'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    });
    root.appendChild(footer);

    document.body.appendChild(root);
    this.overlay = root;
  }
}
