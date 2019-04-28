import Car from '../classes/Car';
import Utils from '../classes/mathHelpers';
import Renderer from '../classes/renderHelpers';


class gameScene extends Phaser.Scene {
  constructor(test) {
    super({
      key: 'gameScene'
    });
  }
  create() {
    let fps = 60; // how many 'update' frames per second
    let step = 1 / fps; // how long is each frame (in seconds)

    this.renderSettings = {
      width: this.sys.game.config.width, // logical canvas width
      height: this.sys.game.config.height, // logical canvas height
      resolution: null, // scaling factor to provide resolution independence (computed)
      fieldOfView: 100, // angle (degrees) for field of view
      cameraHeight: 1000, // z height of camera
      cameraDepth: null, // z distance camera is from screen (computed)
      drawDistance: 300, // number of segments to draw
      position: 0, // current camera Z position (add playerZ to get player's absolute Z position)
      fogDensity: 10 // exponential fog density
    }

    this.ROAD = {
      LENGTH: {
        NONE: 0,
        SHORT: 25,
        MEDIUM: 50,
        LONG: 100
      },
      HILL: {
        NONE: 0,
        LOW: 20,
        MEDIUM: 40,
        HIGH: 60
      },
      CURVE: {
        NONE: 0,
        EASY: 2,
        MEDIUM: 4,
        HARD: 6
      }
    }

    this.segments = []; // array of road segments
    this.segmentSprites = [];

    this.roadWidth = 1000; // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
    this.segmentLength = 200; // length of a single segment
    this.rumbleLength = 3; // number of segments per red/white rumble strip
    this.trackLength = null; // z length of entire track (computed)
    this.lanes = 3; // number of lanes

    this.playerX = 0; // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
    this.playerY = 0;
    this.playerZ = null; // player relative z distance from camera (computed)
    this.centrifugal = 1.2;
    //this.background = this.add.sprite(this.renderSettings.width / 2, this.renderSettings.height / 2, 'bg');
    //this.mainCamera = this.cameras.main;

    this.graphics = this.add.graphics({
      x: 0,
      y: 0
    });

    //this.camera = this.cameras3d.add(90).setPosition(0, -40, 100).setPixelScale(64);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.utils = new Utils(this);
    this.render = new Renderer(this);

    this.build();

    this.playerCar = new Car({
      scene: this,
      key: 'car',
      y: 0,
      x: 0
    });
  }
  update() {

    let playerSegment = this.findSegment(this.renderSettings.position + this.playerZ);
    let speedPercent = (this.playerCar.speed / this.playerCar.maxSpeed)/4;

    //console.log(speedPercent)
    let dx = 0.1 * speedPercent; // at top speed, should be able to cross from left to right (-1 to 1) in 1 second

    if (this.cursors.left.isDown) {
      this.playerX -= dx;
    } else if (this.cursors.right.isDown) {
      this.playerX += dx;
    }

    if (this.cursors.up.isDown) {
      this.playerCar.accelerate();
    } else if (this.cursors.down.isDown) {
      this.playerCar.break();
    } else {
      this.playerCar.decelerate();
    }

    this.renderSettings.position = this.utils.increase(this.renderSettings.position, this.playerCar.speed, this.trackLength);

    this.playerX = this.playerX - (dx * speedPercent * playerSegment.curve * this.centrifugal);

    this.playerX = this.utils.limit(this.playerX, -2, 2); // dont ever let it go too far out of bounds

    this.updateRoad();
  }

  build() {
    this.renderSettings.cameraDepth = 1 / Math.tan((this.renderSettings.fieldOfView / 2) * Math.PI / 180);
    this.playerZ = (this.renderSettings.cameraHeight * this.renderSettings.cameraDepth);
    this.renderSettings.resolution = this.renderSettings.height / (this.renderSettings.height / 2);
    if (this.segments.length == 0) {
      this.buildRoad(); // only build road when necessary
    }
  }

  buildRoad() {
    this.segments = [];

    this.addStraight(this.ROAD.LENGTH.SHORT / 2);
    this.addCurve(this.ROAD.LENGTH.MEDIUM, this.ROAD.CURVE.MEDIUM, this.ROAD.HILL.LOW);


    this.addCurve(this.ROAD.LENGTH.MEDIUM, this.ROAD.CURVE.MEDIUM, this.ROAD.HILL.LOW);
    this.addCurve(this.ROAD.LENGTH.MEDIUM, this.ROAD.CURVE.MEDIUM, this.ROAD.HILL.LOW);
    this.addCurve(this.ROAD.LENGTH.MEDIUM, this.ROAD.CURVE.MEDIUM, this.ROAD.HILL.LOW);

    this.addHill(this.ROAD.LENGTH.SHORT, this.ROAD.HILL.LOW);
    this.addLowRollingHills();
    this.addLowRollingHills();
    this.addCurve(this.ROAD.LENGTH.LONG, this.ROAD.CURVE.MEDIUM, this.ROAD.HILL.MEDIUM);
    this.addStraight();
    this.addCurve(this.ROAD.LENGTH.LONG, -this.ROAD.CURVE.MEDIUM, this.ROAD.HILL.MEDIUM);
    this.addHill(this.ROAD.LENGTH.LONG, this.ROAD.HILL.HIGH);
    this.addCurve(this.ROAD.LENGTH.LONG, this.ROAD.CURVE.MEDIUM, -this.ROAD.HILL.LOW);
    this.addHill(this.ROAD.LENGTH.LONG, -this.ROAD.HILL.MEDIUM);
    this.addStraight();
    this.addDownhillToEnd();

    this.segments[this.findSegment(this.playerZ).index + 2].color = this.render.COLORS.START;
    this.segments[this.findSegment(this.playerZ).index + 3].color = this.render.COLORS.START;

    for (let n = 0; n < this.rumbleLength; n++) {
      this.segments[this.segments.length - 1 - n].color = this.render.COLORS.FINISH;
    }

    this.trackLength = this.segments.length * this.segmentLength;
    this.buildSprites();

    //console.log(this.segments);
  }

  updateRoad() {
    this.graphics.clear();

    let baseSegment = this.findSegment(this.renderSettings.position);

    let basePercent = this.utils.percentRemaining(this.renderSettings.position, this.segmentLength);
    let playerSegment = this.findSegment(this.renderSettings.position + this.playerZ);
    let playerPercent = this.utils.percentRemaining(this.renderSettings.position + this.playerZ, this.segmentLength);
    this.playerY = this.utils.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);

    let maxy = this.renderSettings.height;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);
    let n, segment;

    this.renderSettings.position = this.utils.increase(this.renderSettings.position, this.playerCar.speed, this.trackLength);

    for (n = 0; n < this.renderSettings.drawDistance; n++) {
      segment = this.segments[(baseSegment.index + n) % this.segments.length];
      segment.looped = segment.index < baseSegment.index;
      segment.fog = this.utils.exponentialFog(n / this.renderSettings.drawDistance, this.renderSettings.fogDensity);
      segment.clip = maxy;

      this.utils.project(segment.p1, (this.playerX * this.roadWidth) - x, this.playerY + this.renderSettings.cameraHeight, this.renderSettings.position - (segment.looped ? this.trackLength : 0), this.renderSettings.cameraDepth, this.renderSettings.width, this.renderSettings.height, this.roadWidth);
      this.utils.project(segment.p2, (this.playerX * this.roadWidth) - x - dx, this.playerY + this.renderSettings.cameraHeight, this.renderSettings.position - (segment.looped ? this.trackLength : 0), this.renderSettings.cameraDepth, this.renderSettings.width, this.renderSettings.height, this.roadWidth);

      x = x + dx;
      dx = dx + segment.curve;

      if (segment.sprites.length) {
        for (let i = 0; i < segment.sprites.length; i++) {
          let spriteScale = segment.p1.screen.scale;
          let spriteX = segment.p1.screen.x + (spriteScale * segment.sprites[i].offset * this.roadWidth * this.renderSettings.width / 2);
          let spriteY = segment.p1.screen.y;

          if (segment.p2.screen.y <= maxy) // clip by (already rendered) segment
          {
            segment.sprites[i].spriteRef.setPosition(spriteX, spriteY);
            segment.sprites[i].spriteRef.setScale((spriteScale * 2000));
            segment.sprites[i].spriteRef.setVisible(true);
          } else {
            segment.sprites[i].spriteRef.setVisible(false);
          }
        }
      }

      if ((segment.p1.camera.z <= this.renderSettings.cameraDepth) || // behind us
        (segment.p2.screen.y >= segment.p1.screen.y) || // back face cull
        (segment.p2.screen.y >= maxy)) // clip by (already rendered) segment
        continue;

      this.render.renderSegment(this.renderSettings.width, this.lanes,
        segment.p1.screen.x,
        segment.p1.screen.y,
        segment.p1.screen.w,
        segment.p2.screen.x,
        segment.p2.screen.y,
        segment.p2.screen.w,
        segment.fog,
        segment.color);
      maxy = segment.p2.screen.y;
    }
  }

  buildSprites() {
    this.addSegmentSprite(720, 'billboard', 1);
    this.addSegmentSprite(620, 'billboard', 1);
    this.addSegmentSprite(520, 'billboard', 1);

    this.addSegmentSprite(60, 'car', -1);
    this.addSegmentSprite(40, 'billboard', 1);
    this.addSegmentSprite(40, 'billboard', -1);
    this.addSegmentSprite(20, 'car', -1);
    this.addSegmentSprite(10, 'car', -1);
    this.addSegmentSprite(5, 'billboard', 1);
    this.addSegmentSprite(5, 'billboard', -1);
  }

  findSegment(z) {
    return this.segments[Math.floor(z / this.segmentLength) % this.segments.length];
  }

  lastY() {
    return (this.segments.length == 0) ? 0 : this.segments[this.segments.length - 1].p2.world.y;
  }
  addSegmentSprite(index, spriteKey, offset) {
    let sprite = this.add.sprite(0, 0, spriteKey);

    this.segments[index].sprites.push({
      key: spriteKey,
      offset: offset,
      spriteRef: sprite
    });
    sprite.setVisible(false);
  }

  addSegment(curve, y) {
    let n = this.segments.length;
    this.segments.push({
      index: n,
      p1: {
        world: {
          y: this.lastY(),
          z: n * this.segmentLength
        },
        camera: {},
        screen: {}
      },
      p2: {
        world: {
          y: y,
          z: (n + 1) * this.segmentLength
        },
        camera: {},
        screen: {}
      },
      sprites: [],
      cars: [],
      curve: curve,
      color: Math.floor(n / this.rumbleLength) % 2 ? this.render.COLORS.DARK : this.render.COLORS.LIGHT
    });
  }
  addRoad(enter, hold, leave, curve, y) {
    let startY = this.lastY();
    let endY = startY + (this.utils.toInt(y, 0) * this.segmentLength);
    let n, total = enter + hold + leave;
    for (n = 0; n < enter; n++)
      this.addSegment(this.utils.easeIn(0, curve, n / enter), this.utils.easeInOut(startY, endY, n / total));
    for (n = 0; n < hold; n++)
      this.addSegment(curve, this.utils.easeInOut(startY, endY, (enter + n) / total));
    for (n = 0; n < leave; n++)
      this.addSegment(this.utils.easeInOut(curve, 0, n / leave), this.utils.easeInOut(startY, endY, (enter + hold + n) / total));
  }

  addStraight(num) {
    num = num || this.ROAD.LENGTH.MEDIUM;
    this.addRoad(num, num, num, 0, 0);
  }
  addHill(num, height) {
    num = num || this.ROAD.LENGTH.MEDIUM;
    height = height || this.ROAD.HILL.MEDIUM;
    this.addRoad(num, num, num, 0, height);
  }
  addCurve(num, curve, height) {
    num = num || this.ROAD.LENGTH.MEDIUM;
    curve = curve || this.ROAD.CURVE.MEDIUM;
    height = height || this.ROAD.HILL.NONE;
    this.addRoad(num, num, num, curve, height);
  }

  addLowRollingHills(num, height) {
    num = num || this.ROAD.LENGTH.SHORT;
    height = height || this.ROAD.HILL.LOW;
    this.addRoad(num, num, num, 0, height / 2);
    this.addRoad(num, num, num, 0, -height);
    this.addRoad(num, num, num, 0, height);
    this.addRoad(num, num, num, 0, 0);
    this.addRoad(num, num, num, 0, height / 2);
    this.addRoad(num, num, num, 0, 0);
  }
  addSCurves() {
    this.addRoad(this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, -this.ROAD.CURVE.EASY, this.ROAD.HILL.NONE);
    this.addRoad(this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, this.ROAD.CURVE.MEDIUM, this.ROAD.HILL.MEDIUM);
    this.addRoad(this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, this.ROAD.CURVE.EASY, -this.ROAD.HILL.LOW);
    this.addRoad(this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, -this.ROAD.CURVE.EASY, this.ROAD.HILL.MEDIUM);
    this.addRoad(this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, this.ROAD.LENGTH.MEDIUM, -this.ROAD.CURVE.MEDIUM, -this.ROAD.HILL.MEDIUM);
  }
  addDownhillToEnd(num) {
    num = num || 200;
    this.addRoad(num, num, num, -this.ROAD.CURVE.EASY, -this.lastY() / this.segmentLength);
  }
}
export default gameScene;
