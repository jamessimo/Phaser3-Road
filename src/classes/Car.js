export default class Car extends Phaser.GameObjects.Sprite {
  constructor(config) {
    super(config.scene, config.x, config.y, config.key);

    config.scene.add.existing(this);

    this.speed = 0; // current speed
    this.maxSpeed = config.scene.segmentLength/1.5; // top speed (ensure we can't move more than 1 segment in a single frame to make collision detection easier)
    this.accel = 1; // acceleration rate - tuned until it 'felt' right
    this.breaking = 2; // deceleration rate when braking
    this.decel = 1.2; // 'natural' deceleration rate when neither accelerating, nor braking
    this.offRoadDecel = -this.maxSpeed / 2; // off road deceleration is somewhere in between
    this.offRoadLimit = this.maxSpeed / 4; // limit when off road deceleration no longer applies (e.g. you can always go at least this speed even when off road)

    this.driveRumble = 1;
    this.offRoadRumble = 2;

    this.alive = true;
    this.localScale = config.scene.cameraDepth / config.scene.playerZ;
    this.setScale(2);
    this.x = this.scene.renderSettings.width / 2;
    this.y = this.scene.renderSettings.height - this.height;
    this.startY = this.y;

  }
  update() {

    //let destW = (this.width * 1 * this.width / 2) * (1 * this.scene.roadWidth);
    //let destH = (this.height * 1 * this.width / 2) * (1 * this.scene.roadWidth);

    //this.projectedScale = ((this.scene.cameraDepth/this.scene.playerZ)*this.height)*45

    //this.setScale(this.projectedScale);

  }

  accelerate(){


    if(this.y >= (this.startY + 1) || this.y <= ( this.startY - 1))
      this.y = this.startY;
    else
      this.y += Phaser.Math.Between(-1,1);


    if(this.speed < this.maxSpeed){
      this.speed += this.accel;
    }
  }
  decelerate(){
    if(this.speed > 0)
      this.speed -= this.decel;
    else
      this.speed = 0;
  }
  break(){
    if(this.speed > 0)
      this.speed -= this.breaking;
    else
      this.speed = 0;
  }
  turnLeft(){

  }
  turnRight(){

  }


}
