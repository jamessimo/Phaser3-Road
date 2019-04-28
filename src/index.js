import 'phaser';
import bootScene from './scenes/bootScene';
import gameScene from './scenes/gameScene';
//import titleScene from './scenes/titleScene';

const config = {
    type: Phaser.WEBGL,
  //  backgroundColor: COLORS.SKY,
    parent: "phaser-runner",
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
    pixelArt: true,
    antialias: false,
  //  roundPixels: true,
    scene: [
        bootScene,
      //  titleScene,
        gameScene
    ]
};

const game = new Phaser.Game(config); // eslint-disable-line no-unused-vars
