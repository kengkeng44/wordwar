import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add
      .text(width / 2, height / 2 - 50, 'WordWar', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#f4f4f5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 20, '同義反義對戰 · scaffold ready', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#a1a1aa',
      })
      .setOrigin(0.5);

    const tap = this.add
      .text(width / 2, height / 2 + 70, 'Tap anywhere to play', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#6366f1',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 30, 'v0.0.1 · Phaser ' + Phaser.VERSION, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#52525b',
      })
      .setOrigin(0.5);

    // Pulse the "tap" hint so the affordance reads.
    this.tweens.add({
      targets: tap,
      alpha: { from: 1, to: 0.4 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      this.scene.start('PlayScene');
    };

    // Auto-advance after 1.5s, or on any click/tap.
    this.time.delayedCall(1500, advance);
    this.input.once('pointerdown', advance);
  }
}
