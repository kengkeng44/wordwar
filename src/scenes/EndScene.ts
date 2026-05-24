import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';

export class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const state = useRunStore.getState();

    const correct = state.history.filter((h) => h.correct).length;
    const wrong = state.history.length - correct;
    const dead = state.hp <= 0;

    this.add
      .text(width / 2, height / 2 - 140, dead ? 'You ran out of HP' : 'Run complete', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: dead ? '#ef4444' : '#f4f4f5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 60, `Final score: ${state.score}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#22c55e',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 10, `Correct: ${correct}    Wrong: ${wrong}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '22px',
        color: '#a1a1aa',
      })
      .setOrigin(0.5);

    // "Play again" button — a Graphics rectangle + Text inside a Container.
    const btnW = 220;
    const btnH = 60;
    const btnX = width / 2;
    const btnY = height / 2 + 110;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x6366f1, 1);
    btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);

    const btnText = this.add
      .text(btnX, btnY, 'Play again', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const hit = this.add
      .zone(btnX, btnY, btnW, btnH)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x818cf8, 1);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    });
    hit.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x6366f1, 1);
      btnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    });
    hit.on('pointerup', () => {
      useRunStore.getState().reset();
      this.scene.start('PlayScene');
    });

    // Silences "unused locals" — btnText is needed visually, but TS sees no read.
    btnText.setVisible(true);
  }
}
