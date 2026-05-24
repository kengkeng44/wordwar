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

    this.add
      .text(width / 2, height - 30, 'v0.0.1 · Phaser ' + Phaser.VERSION, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#52525b',
      })
      .setOrigin(0.5);
  }
}
