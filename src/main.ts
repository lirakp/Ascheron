import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { TitleScene } from './scenes/Title';
import { WorldScene } from './scenes/World';
import { DungeonScene } from './scenes/Dungeon';
import { TowerScene } from './scenes/Tower';
import { BattleScene } from './scenes/Battle';

const stage = document.getElementById('stage')!;
let game: Phaser.Game;
function fit(): void {
  const s = Math.min(window.innerWidth / 960, window.innerHeight / 540);
  stage.style.transform = `scale(${s})`;
  game?.scale.refresh();
}
window.addEventListener('resize', fit);
fit();

game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game',
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.NONE },
  input: { keyboard: { capture: [] } },
  scene: [BootScene, TitleScene, WorldScene, DungeonScene, TowerScene, BattleScene],
});
(window as unknown as { __game: Phaser.Game }).__game = game;
setTimeout(fit, 50);
