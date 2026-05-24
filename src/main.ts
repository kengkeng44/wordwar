import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PlayScene } from './scenes/PlayScene';
import { EndScene } from './scenes/EndScene';
import './style.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 900,
  height: 600,
  backgroundColor: '#0e0e16',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PlayScene, EndScene],
};

new Phaser.Game(config);
