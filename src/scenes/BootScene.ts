import Phaser from 'phaser';
import { updateStreak } from '../data/streak';

/**
 * BootScene — v1.7.0 pass-through.
 *
 * The visible "welcome" screen is gone. On page load the user sees:
 *   1. (inline HTML) tear-drop intro animation — orange shell with the
 *      calico cat face, tear falls, cream disc expands.
 *   2. (this scene) immediately advances to MenuScene under the still-
 *      fading orange shell. By the time the shell finishes fading
 *      (≈2.6s), MenuScene is fully mounted and visible.
 *
 * Difficulty picker was moved to MenuScene so the user can still pick
 * a level — see the difficulty pill above the Story card.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#fef8ed');
    // v1.9.4: tick the daily streak on every app boot (idempotent — only
    // changes state when the calendar day differs from lastDate).
    updateStreak();
    // Defer one tick to let Phaser settle the camera before scene swap.
    // v1.7.4: tear-intro -> map view directly. MenuScene's mode-card
    // intermediate page was deleted from the main flow (still callable
    // for legacy fallback paths). All modes are now reachable from the
    // bottom nav inside StoryModeScene.
    this.time.delayedCall(0, () => this.scene.start('StoryModeScene'));
  }
}
