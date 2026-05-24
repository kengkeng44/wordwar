import Phaser from 'phaser';
import type { POS } from '../data/vocab';

export type CardState = 'idle' | 'hover' | 'pressed' | 'correct' | 'wrong';

export interface CardSpriteOpts {
  scene: Phaser.Scene;
  x: number;
  y: number;
  word: string;
  pos: POS;
  width?: number;
  height?: number;
  onClick?: (word: string) => void;
}

const W = 140;
const H = 180;
const RADIUS = 14;

const COLORS = {
  idleFill: 0x1e1e2a,
  idleStroke: 0x3f3f54,
  hoverFill: 0x2a2a3c,
  hoverStroke: 0x6366f1,
  pressedFill: 0x16161f,
  pressedStroke: 0x6366f1,
  correctFill: 0x14532d,
  correctStroke: 0x22c55e,
  wrongFill: 0x4a1d1d,
  wrongStroke: 0xef4444,
  badgeBg: 0x3730a3,
};

const POS_LABEL: Record<POS, string> = {
  n: 'n.',
  v: 'v.',
  a: 'adj.',
  r: 'adv.',
};

/**
 * A single clickable word-card. Composed of a Container holding:
 *   - background Graphics (rounded rect with state-driven fill/stroke)
 *   - POS badge Graphics + Text
 *   - word Text
 *
 * Uses Phaser's input system so it works for mouse + touch alike.
 */
export class CardSprite extends Phaser.GameObjects.Container {
  public readonly word: string;
  public readonly pos: POS;
  private bg: Phaser.GameObjects.Graphics;
  private badge: Phaser.GameObjects.Graphics;
  private wordText: Phaser.GameObjects.Text;
  private badgeText: Phaser.GameObjects.Text;
  private cardState: CardState = 'idle';
  private cardW: number;
  private cardH: number;
  private isActive = true;
  private onClickCb?: (word: string) => void;

  constructor(opts: CardSpriteOpts) {
    super(opts.scene, opts.x, opts.y);
    this.word = opts.word;
    this.pos = opts.pos;
    this.cardW = opts.width ?? W;
    this.cardH = opts.height ?? H;
    this.onClickCb = opts.onClick;

    // Create children WITHOUT adding them to the scene; the container owns them.
    this.bg = new Phaser.GameObjects.Graphics(opts.scene);
    this.add(this.bg);

    this.badge = new Phaser.GameObjects.Graphics(opts.scene);
    this.add(this.badge);

    this.badgeText = new Phaser.GameObjects.Text(opts.scene, 0, 0, POS_LABEL[opts.pos], {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '14px',
      color: '#e0e7ff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(this.badgeText);

    this.wordText = new Phaser.GameObjects.Text(opts.scene, 0, 0, opts.word, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      color: '#f4f4f5',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: this.cardW - 20 },
    }).setOrigin(0.5);
    this.add(this.wordText);

    // Hit area covering the card.
    this.setSize(this.cardW, this.cardH);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.cardW / 2, -this.cardH / 2, this.cardW, this.cardH),
      Phaser.Geom.Rectangle.Contains
    );

    this.on('pointerover', () => {
      if (this.isActive && this.cardState === 'idle') this.setCardState('hover');
    });
    this.on('pointerout', () => {
      if (this.isActive && (this.cardState === 'hover' || this.cardState === 'pressed')) {
        this.setCardState('idle');
      }
    });
    this.on('pointerdown', () => {
      if (this.isActive) this.setCardState('pressed');
    });
    this.on('pointerup', () => {
      if (!this.isActive) return;
      this.setCardState('hover');
      if (this.onClickCb) this.onClickCb(this.word);
    });

    this.layout();
    this.setCardState('idle');

    opts.scene.add.existing(this as Phaser.GameObjects.Container);
  }

  private layout(): void {
    // Badge top-left.
    const badgeW = 36;
    const badgeH = 22;
    const badgeX = -this.cardW / 2 + 10 + badgeW / 2;
    const badgeY = -this.cardH / 2 + 10 + badgeH / 2;
    this.badgeText.setPosition(badgeX, badgeY);
    this.wordText.setPosition(0, 6);
  }

  setCardState(state: CardState): void {
    this.cardState = state;
    this.redraw();
  }

  setEnabled(enabled: boolean): void {
    this.isActive = enabled;
    if (enabled) {
      this.setCardState('idle');
    }
  }

  flashCorrect(): void {
    this.setCardState('correct');
  }

  flashWrong(): void {
    this.setCardState('wrong');
  }

  private redraw(): void {
    const { fill, stroke } = this.colorsForState();
    this.bg.clear();
    this.bg.fillStyle(fill, 1);
    this.bg.lineStyle(2, stroke, 1);
    const hw = this.cardW / 2;
    const hh = this.cardH / 2;
    this.bg.fillRoundedRect(-hw, -hh, this.cardW, this.cardH, RADIUS);
    this.bg.strokeRoundedRect(-hw, -hh, this.cardW, this.cardH, RADIUS);

    // Badge background.
    this.badge.clear();
    const badgeW = 36;
    const badgeH = 22;
    const badgeX = -hw + 10;
    const badgeY = -hh + 10;
    this.badge.fillStyle(COLORS.badgeBg, 1);
    this.badge.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, 6);
  }

  private colorsForState(): { fill: number; stroke: number } {
    switch (this.cardState) {
      case 'hover':
        return { fill: COLORS.hoverFill, stroke: COLORS.hoverStroke };
      case 'pressed':
        return { fill: COLORS.pressedFill, stroke: COLORS.pressedStroke };
      case 'correct':
        return { fill: COLORS.correctFill, stroke: COLORS.correctStroke };
      case 'wrong':
        return { fill: COLORS.wrongFill, stroke: COLORS.wrongStroke };
      case 'idle':
      default:
        return { fill: COLORS.idleFill, stroke: COLORS.idleStroke };
    }
  }
}
