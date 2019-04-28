class bootScene extends Phaser.Scene {
    constructor(test) {
        super({
            key: 'bootScene'
        });
    }
    preload() {
      const progress = this.add.graphics();

        // Register a load progress event to show a load bar
        this.load.on('progress', (value) => {
            progress.clear();
            progress.fillStyle(0xffffff, 1);
            progress.fillRect(0, this.sys.game.config.height / 2, this.sys.game.config.width * value, 60);
        });

        // Register a load complete event to launch the title screen when all files are loaded
        this.load.on('complete', () => {
            // prepare all animations, defined in a separate file
            progress.destroy();
            this.scene.start('gameScene');
        });


        this.load.image("bg", '/assets/background.png');
        this.load.image("car", './assets/carSingle.png');
        this.load.image("logo", './assets/logo.png');
        this.load.image("billboard", './assets/billboard.png');


    }
}

export default bootScene;
