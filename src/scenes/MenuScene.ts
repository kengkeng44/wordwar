import Phaser from 'phaser';
import { ModeMenu } from '../ui/ModeMenu';
import { useRunStore } from '../store/runStore';
import { audio } from '../audio/AudioManager';

/**
 * MenuScene — v0.4 entry point.
 *
 * Phaser side: pure white backdrop. No Phaser text. ModeMenu DOM
 * overlay paints the entire menu (Duolingo style).
 */
export class MenuScene extends Phaser.Scene {
  private modeMenu?: ModeMenu;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');

    this.modeMenu = new ModeMenu({
      onStartFree: () => {
        audio.ensureContext();
        const store = useRunStore.getState();
        store.setMode('free');
        store.setScenario(null);
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
