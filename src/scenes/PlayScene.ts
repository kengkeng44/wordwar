import Phaser from 'phaser';
import { useRunStore } from '../store/runStore';
import { roundTypeLabel } from '../data/roundGenerator';
import { CardSprite } from '../ui/CardSprite';
import type { Vocab } from '../data/vocab';

const ROUNDS_PER_RUN = 10;
const FLASH_MS = 800;

export class PlayScene extends Phaser.Scene {
  private targetText!: Phaser.GameObjects.Text;
  private typeText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private loadingText?: Phaser.GameObjects.Text;
  private cardSprites: CardSprite[] = [];
  private cardsLocked = false;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // HUD: top center target + round type
    this.typeText = this.add
      .text(width / 2, 40, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#a1a1aa',
      })
      .setOrigin(0.5);

    this.targetText = this.add
      .text(width / 2, 90, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#f4f4f5',
      })
      .setOrigin(0.5);

    // HUD: middle row — HP + Score + Round
    this.hpText = this.add.text(40, 170, 'HP: -', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '20px',
      color: '#ef4444',
    });

    this.scoreText = this.add
      .text(width / 2, 170, 'Score: 0', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '20px',
        color: '#22c55e',
      })
      .setOrigin(0.5, 0);

    this.roundText = this.add
      .text(width - 40, 170, 'Round: 0/' + ROUNDS_PER_RUN, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '20px',
        color: '#a1a1aa',
      })
      .setOrigin(1, 0);

    this.loadingText = this.add
      .text(width / 2, height / 2, 'Loading vocab…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#a1a1aa',
      })
      .setOrigin(0.5);

    this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const store = useRunStore.getState();
    await store.loadVocab();
    const after = useRunStore.getState();
    if (after.error || !after.vocab) {
      this.loadingText?.setText('Failed to load vocab: ' + (after.error ?? 'unknown'));
      return;
    }
    this.loadingText?.destroy();
    this.loadingText = undefined;
    store.reset();
    this.nextRound();
  }

  private nextRound(): void {
    const store = useRunStore.getState();
    if (!store.vocab) return;

    // End-of-run checks BEFORE rolling another round.
    const rounds = store.history.length;
    if (rounds >= ROUNDS_PER_RUN || store.hp <= 0) {
      this.scene.start('EndScene');
      return;
    }

    store.startRound();
    this.renderHud();
    this.renderHand(useRunStore.getState().vocab!);
  }

  private renderHud(): void {
    const state = useRunStore.getState();
    const round = state.round;
    if (!round) return;
    this.typeText.setText(roundTypeLabel(round.type));
    this.targetText.setText(round.target);
    this.hpText.setText(`HP: ${state.hp}`);
    this.scoreText.setText(`Score: ${state.score}`);
    this.roundText.setText(`Round: ${state.history.length + 1}/${ROUNDS_PER_RUN}`);
  }

  private renderHand(vocab: Vocab): void {
    // Tear down existing card sprites.
    for (const c of this.cardSprites) c.destroy();
    this.cardSprites = [];
    this.cardsLocked = false;

    const round = useRunStore.getState().round;
    if (!round) return;

    const { width, height } = this.cameras.main;
    const gap = 20;
    const cardW = 140;
    const totalW = round.hand.length * cardW + (round.hand.length - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;
    const y = height - 130;

    round.hand.forEach((word, idx) => {
      const entry = vocab[word];
      const pos = entry ? entry.pos : 'n';
      const sprite = new CardSprite({
        scene: this,
        x: startX + idx * (cardW + gap),
        y,
        word,
        pos,
        onClick: (w) => this.handleCardClick(w),
      });
      this.cardSprites.push(sprite);
    });
  }

  private handleCardClick(word: string): void {
    if (this.cardsLocked) return;
    this.cardsLocked = true;
    for (const c of this.cardSprites) c.setEnabled(false);

    const store = useRunStore.getState();
    const result = store.playCard(word);

    const playedSprite = this.cardSprites.find((c) => c.word === word);
    if (playedSprite) {
      if (result.correct) playedSprite.flashCorrect();
      else playedSprite.flashWrong();
    }

    // Update HUD immediately so the user sees HP/score change.
    this.renderHud();

    this.time.delayedCall(FLASH_MS, () => this.nextRound());
  }
}
