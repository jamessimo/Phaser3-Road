
//------

import Phaser from "phaser";
//import Car from "./classes/Car";

import logoImg from "../assets/logo.png";
import roadTexture from "../assets/stripes800x32-v2.png";
import grassTexture from "../assets/grassStrips.png";
import bgTexture from "../assets/background.png";
import carTexture from "../assets/carSingle.png";


const COLORS = {
  SKY: "0x72D7EE",
  TREE: "0x005108",
  FOG: "0x4b692f",
  LIGHT: {
    road: "0x6B6B6B",
    grass: "0x10AA10",
    rumble: "0x555555",
    lane: "0xCCCCCC"
  },
  DARK: {
    road: "0x696969",
    grass: "0x009A00",
    rumble: "0xBBBBBB"
  },
  START: {
    road: "0xffffff",
    grass: "0xffffff",
    rumble: "0xffffff"
  },
  FINISH: {
    road: "0x000000",
    grass: "0x000000",
    rumble: "0x000000"
  }
};

const config = {
  type: Phaser.WEBGL,
  backgroundColor: COLORS.SKY,
  parent: "phaser-runner",
  width: 800,
  height: 600,
  pixelArt: true,
  roundPixels: true,
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

//------------
var fps = 60; // how many 'update' frames per second
var step = 1 / fps; // how long is each frame (in seconds)
var width = config.width; // logical canvas width
var height = config.height; // logical canvas height
var segments = []; // array of road segments
var background = null; // our background image (loaded below)
var sprites = null; // our spritesheet (loaded below)
var resolution = null; // scaling factor to provide resolution independence (computed)
var roadWidth = 2000; // actually half the roads width, easier math if the road spans from -roadWidth to +roadWidth
var segmentLength = 200; // length of a single segment
var rumbleLength = 3; // number of segments per red/white rumble strip
var trackLength = null; // z length of entire track (computed)
var lanes = 3; // number of lanes
var fieldOfView = 100; // angle (degrees) for field of view
var cameraHeight = 1000; // z height of camera
var cameraDepth = null; // z distance camera is from screen (computed)
var drawDistance = 300; // number of segments to draw
var playerX = 0; // player x offset from center of road (-1 to 1 to stay independent of roadWidth)
var playerZ = null; // player relative z distance from camera (computed)
var fogDensity = 5; // exponential fog density
var position = 0; // current camera Z position (add playerZ to get player's absolute Z position)
var speed = 0; // current speed
var maxSpeed = segmentLength / step; // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
var accel = maxSpeed / 5; // acceleration rate - tuned until it 'felt' right
var breaking = -maxSpeed; // deceleration rate when braking
var decel = -maxSpeed / 5; // 'natural' deceleration rate when neither accelerating, nor braking
var offRoadDecel = -maxSpeed / 2; // off road deceleration is somewhere in between
var offRoadLimit = maxSpeed / 4; // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)
//------------
let lockCTX;
let camera;
let cursors;
let road;
let rumble;
let graphics;
let startZ;

let player;

var quad;

var container;

const POLYRENDER = true;
const WIREFRAME = false;
const game = new Phaser.Game(config);

function preload() {

  this.load.spritesheet('strip', roadTexture, {
    frameWidth: 800,
    frameHeight: 32
  });

  this.load.spritesheet('grassStrip', grassTexture, {
    frameWidth: 800,
    frameHeight: 16
  });

  this.load.image("bg", bgTexture);
  this.load.image("car", carTexture);



  this.load.image("logo", logoImg);
}

function create() {
  lockCTX = this;
  background = this.add.sprite(width/2  ,height/2,'bg');


  graphics = this.add.graphics({
    x: 0,
    y: 0
  });

  container = this.add.container(0, 0);


  reset();

  //camera = this.cameras3d.add(90).setPosition(0, -40, 100).setPixelScale(64);

  cursors = this.input.keyboard.createCursorKeys();

}

function update(t, dt) {


  position = Util.increase(position, dt * speed, trackLength);
  var dx = dt * 2 * (speed / maxSpeed); // at top speed, should be able to cross from left to right (-1 to 1) in 1 second

  //  Scroll the road

  if (cursors.up.isDown) {
    speed += 0.5;

    //speed = Util.accelerate(speed, accel, dt);
  } else if (cursors.down.isDown) {
    cameraHeight += 10;
  //  fogDensity += 1;
  }
  else {
    speed -= 2;

    //  speed = Util.accelerate(speed, decel, dt);
  }
  speed = Util.limit(speed, 0, maxSpeed); // or exceed maxSpeed

  //console.log(position)


  graphics.clear();

 container.destroy();

  var baseSegment = findSegment(position);
console.log(baseSegment)
  var maxy = height;
  var n, segment;


  container = this.add.container(0, 0);

  for (n = 0; n < drawDistance; n++) {
    segment = segments[(baseSegment.index + n) % segments.length];
    segment.looped = segment.index < baseSegment.index;
    segment.fog = Util.exponentialFog(n / drawDistance, fogDensity);
    Util.project(segment.p1, (playerX * roadWidth), cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);
    Util.project(segment.p2, (playerX * roadWidth), cameraHeight, position - (segment.looped ? trackLength : 0), cameraDepth, width, height, roadWidth);
    if ((segment.p1.camera.z <= cameraDepth) || // behind us
      (segment.p2.screen.y >= maxy)) // clip by (already rendered) segment
      continue;
    Render.segment(width, lanes,
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
  /*
  Render.player(width, height, resolution, roadWidth, sprites, speed / maxSpeed,
    cameraDepth / playerZ,
    width / 2,
    height,
    speed * 1,
    0);*/

}

function resetRoad() {
  segments = [];
  for (var n = 0; n < 500; n++) {
    segments.push({
      index: n,
      p1: {
        world: {
          z: n * segmentLength
        },
        camera: {},
        screen: {}
      },
      p2: {
        world: {
          z: (n + 1) * segmentLength
        },
        camera: {},
        screen: {}
      },
      color: Math.floor(n / rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT
    });
  }
  segments[findSegment(playerZ).index + 2].color = COLORS.START;
  segments[findSegment(playerZ).index + 3].color = COLORS.START;
  for (var n = 0; n < rumbleLength; n++)
    segments[segments.length - 1 - n].color = COLORS.FINISH;
  trackLength = segments.length * segmentLength;

  console.log(segments);
}

function findSegment(z) {
  return segments[Math.floor(z / segmentLength) % segments.length];
}

const Util = {

  timestamp: function() {
    return new Date().getTime();
  },
  toInt: function(obj, def) {
    if (obj !== null) {
      var x = parseInt(obj, 10);
      if (!isNaN(x)) return x;
    }
    return Util.toInt(def, 0);
  },
  toFloat: function(obj, def) {
    if (obj !== null) {
      var x = parseFloat(obj);
      if (!isNaN(x)) return x;
    }
    return Util.toFloat(def, 0.0);
  },
  limit: function(value, min, max) {
    return Math.max(min, Math.min(value, max));
  },
  randomInt: function(min, max) {
    return Math.round(Util.interpolate(min, max, Math.random()));
  },
  randomChoice: function(options) {
    return options[Util.randomInt(0, options.length - 1)];
  },
  percentRemaining: function(n, total) {
    return (n % total) / total;
  },
  accelerate: function(v, accel, dt) {
    return v + (accel * dt);
  },
  interpolate: function(a, b, percent) {
    return a + (b - a) * percent
  },
  easeIn: function(a, b, percent) {
    return a + (b - a) * Math.pow(percent, 2);
  },
  easeOut: function(a, b, percent) {
    return a + (b - a) * (1 - Math.pow(1 - percent, 2));
  },
  easeInOut: function(a, b, percent) {
    return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
  },
  exponentialFog: function(distance, density) {
    return 1 / (Math.pow(Math.E, (distance * distance * density)));
  },

  increase: function(start, increment, max) { // with looping
    var result = start + increment;
    while (result >= max)
      result -= max;
    while (result < 0)
      result += max;
    return result;
  },

  project: function(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
  },

  overlap: function(x1, w1, x2, w2, percent) {
    var half = (percent || 1) / 2;
    var min1 = x1 - (w1 * half);
    var max1 = x1 + (w1 * half);
    var min2 = x2 - (w2 * half);
    var max2 = x2 + (w2 * half);
    return !((max1 < min2) || (min1 > max2));
  }
}

const Render = {
  polygon: function(x1, y1, x2, y2, x3, y3, x4, y4, color, opacity) {

    if(POLYRENDER){
      var polygon = new Phaser.Geom.Polygon([
        x1, y1,
        x2, y2,
        x3, y3,
        x4, y4
      ]);
      if (!WIREFRAME) {
        graphics.fillStyle(color, opacity);
        graphics.fillPoints(polygon.points, true);
      } else {
        graphics.lineStyle(2, 0x9600ff, 1);//opacity - 1
        graphics.beginPath();
        graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
        for (var i = 1; i < polygon.points.length; i++) {
          graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
        }
        graphics.closePath();
        graphics.strokePath();
      }
    } else {

      if(color == COLORS.LIGHT.road){
        quad = lockCTX.add.quad(0, 0, 'strip',1);
      }else{
        quad = lockCTX.add.quad(0, 0, 'strip',0);
      }

      quad.setTopLeft(x1, y1);      quad.setTopRight(x2, y2);
      quad.setBottomRight(x3, y3);  quad.setBottomLeft(x4, y4);

      if(opacity < 1){
        //quad.setBlendMode("SCREEN");
      }
      container.add(quad);
    }
  },

  //---------------------------------------------------------------------------

  segment: function(width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {

    var r1 = Render.rumbleWidth(w1, lanes),
      r2 = Render.rumbleWidth(w2, lanes),
      l1 = Render.laneMarkerWidth(w1, lanes),
      l2 = Render.laneMarkerWidth(w2, lanes),
      lanew1, lanew2, lanex1, lanex2, lane;


    if (!WIREFRAME && POLYRENDER) {
      graphics.fillStyle(color.grass, 1);//fog
      graphics.fillRect(0, y2, width, y1 - y2);
    }else{

      var grass = new Phaser.Geom.Rectangle(0, y2, width, y1 - y2);

    //  graphics.fillStyle(color.grass, fog);
      var grassCoords = Phaser.Geom.Rectangle.Decompose(grass);

      //Change poly dependent on height (90);

      if(color.road == COLORS.LIGHT.road ){
        quad = lockCTX.add.quad(0, 0, 'grassStrip',2);
      }
      else{
        quad = lockCTX.add.quad(0, 0, 'grassStrip',0);
      }

      quad.setTopLeft(grassCoords[0].x, grassCoords[0].y);
      quad.setTopRight(grassCoords[1].x, grassCoords[1].y);
      quad.setBottomRight(grassCoords[2].x, grassCoords[2].y);
      quad.setBottomLeft(grassCoords[3].x, grassCoords[3].y);
      //CAN PASS IN POLYGON
      if(fog < 1){
        //quad.setBlendMode("SCREEN");
      }
      container.add(quad)
    }

    Render.polygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble, fog);
    Render.polygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble, fog);
    Render.polygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

    if (color.lane) {
      lanew1 = w1 * 2 / lanes;
      lanew2 = w2 * 2 / lanes;
      lanex1 = x1 - w1 + lanew1;
      lanex2 = x2 - w2 + lanew2;
      for (lane = 1; lane < lanes; lanex1 += lanew1, lanex2 += lanew2, lane++)
        Render.polygon(lanex1 - l1 / 2, y1, lanex1 + l1 / 2, y1, lanex2 + l2 / 2, y2, lanex2 - l2 / 2, y2, color.lane, fog);
    }
    Render.fog(0, y1, width, y2 - y1, fog);

  },
  player: function(width, height, resolution, roadWidth, sprites, speedPercent, scale, destX, destY, steer, updown) {

    //   var bounce = (1.5 * Math.random() * speedPercent * resolution) * Util.randomChoice([-1,1]);
    // var sprite;
    //if (steer < 0)
    //sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_LEFT : SPRITES.PLAYER_LEFT;
    // else if (steer > 0)
    //sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_RIGHT : SPRITES.PLAYER_RIGHT;
    // else
    //sprite = (updown > 0) ? SPRITES.PLAYER_UPHILL_STRAIGHT : SPRITES.PLAYER_STRAIGHT;

    //Render.sprite(ctx, width, height, resolution, roadWidth, sprites, sprite, scale, destX, destY + bounce, -0.5, -1);
  },

  fog: function(x, y, width, height, fog) {
    if (fog < 1) {

      var rect = new Phaser.Geom.Rectangle(x, y, width, height);

      graphics.fillStyle(COLORS.FOG, 1 - fog);
      graphics.fillRectShape(rect);

    }
  },
  rumbleWidth: function(projectedRoadWidth, lanes) {
    return projectedRoadWidth / Math.max(6, 2 * lanes);
  },
  laneMarkerWidth: function(projectedRoadWidth, lanes) {
    return projectedRoadWidth / Math.max(32, 8 * lanes);
  }

}

function reset(options) {
  options = options || {};
  width = Util.toInt(options.width, width);
  height = Util.toInt(options.height, height);
  lanes = Util.toInt(options.lanes, lanes);
  roadWidth = Util.toInt(options.roadWidth, roadWidth);
  cameraHeight = Util.toInt(options.cameraHeight, cameraHeight);
  drawDistance = Util.toInt(options.drawDistance, drawDistance);
  fogDensity = Util.toInt(options.fogDensity, fogDensity);
  fieldOfView = Util.toInt(options.fieldOfView, fieldOfView);
  segmentLength = Util.toInt(options.segmentLength, segmentLength);
  rumbleLength = Util.toInt(options.rumbleLength, rumbleLength);
  cameraDepth = 1 / Math.tan((fieldOfView / 2) * Math.PI / 180);
  playerZ = (cameraHeight * cameraDepth);
  resolution = height / 480;
  if ((segments.length == 0) || (options.segmentLength) || (options.rumbleLength))
    resetRoad(); // only rebuild road when necessary
}
