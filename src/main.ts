import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { EndScene } from './scenes/EndScene';
import { StoryModeScene } from './scenes/StoryModeScene';
import { ChapterIntroScene } from './scenes/ChapterIntroScene';
import { ChapterEndScene } from './scenes/ChapterEndScene';
import { StoryEndingScene } from './scenes/StoryEndingScene';
import './style.css';

/**
 * Portrait phone-app layout (v0.3 rework).
 *
 * 400 × 800 reference resolution, FIT scaled so the canvas centers in the
 * #app container (which is itself capped at 480px wide). On desktop the
 * surrounding cream bezel shows the "phone" framing; on mobile the canvas
 * fills the screen edge-to-edge.
 */
export const PHASER_WIDTH = 400;
export const PHASER_HEIGHT = 800;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: PHASER_WIDTH,
  height: PHASER_HEIGHT,
  backgroundColor: '#fef8ed',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
    touch: {
      capture: true,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    StoryModeScene,
    ChapterIntroScene,
    PlayScene,
    ChapterEndScene,
    StoryEndingScene,
    EndScene,
  ],
};

new Phaser.Game(config);
