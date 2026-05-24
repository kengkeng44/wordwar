import Phaser from 'phaser';
import { ModeMenu } from '../ui/ModeMenu';
import { useRunStore } from '../store/runStore';
import { audio } from '../audio/AudioManager';

/**
 * MenuScene — v0.4 entry point. v0.8 adds the story-mode CTA as the
 * primary action (handled inside ModeMenu).
 *
 * Phaser side: cream backdrop matching the new warm palette. No Phaser
 * text. ModeMenu DOM overlay paints the entire menu.
 */
export class MenuScene extends Phaser.Scene {
  private modeMenu?: ModeMenu;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#fef8ed');

    this.modeMenu = new ModeMenu({
      onStartStory: () => {
        audio.ensureContext();
        this.modeMenu?.destroy();
        this.modeMenu = undefined;
        this.scene.start('StoryModeScene');
      },
      onStartFree: () => {
        audio.ensureContext();
        const store = useRunStore.getState();
        store.setMode('free');
        store.setScenario(null);
        store.setChapter(null);
        store.setLevel('A2');
        this.modeMenu?.destroy();
        this.modeMenu = undefined;
        this.scene.start('PlayScene');
      },
      onStartScenario: (id) => {
        audio.ensureContext();
        const store = useRunStore.getState();
        store.setMode('scenario');
        store.setScenario(id);
        store.setChapter(null);
        store.setLevel('A2');
        this.modeMenu?.destroy();
        this.modeMenu = undefined;
        this.scene.start('PlayScene');
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.modeMenu?.destroy();
      this.modeMenu = undefined;
    });
  }
}
