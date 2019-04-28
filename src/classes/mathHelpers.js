export default class mathHelpers{
  constructor(test) {

  }
  project(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
  }

  overlap(x1, w1, x2, w2, percent) {
    let half = (percent || 1) / 2;
    let min1 = x1 - (w1 * half);
    let max1 = x1 + (w1 * half);
    let min2 = x2 - (w2 * half);
    let max2 = x2 + (w2 * half);
    return !((max1 < min2) || (min1 > max2));
  }
  exponentialFog(distance, density) {
    return 1 / (Math.pow(Math.E, (distance * distance * density)));
  }
  increase(start, increment, max) { // with looping
    let result = start + increment;
    while (result >= max)
      result -= max;
    while (result < 0)
      result += max;
    return result;
  }
  rumbleWidth(projectedRoadWidth, lanes) {
    return projectedRoadWidth / Math.max(6, 2 * lanes);
  }
  laneMarkerWidth(projectedRoadWidth, lanes) {
    return projectedRoadWidth / Math.max(32, 8 * lanes);
  }
  percentRemaining(n, total){
    return (n%total)/total;
  }
  toInt(obj, def) {
    if (obj !== null) {
       let x = parseInt(obj, 10);
      if (!isNaN(x))
      return x;
    }
    return this.toInt(def, 0);
  }
  limit(value, min, max){
    return Math.max(min, Math.min(value, max));
  }                    
  interpolate(a,b,percent){
    return a + (b-a)*percent
  }
  easeIn(a,b,percent){ return a + (b-a)*Math.pow(percent,2);}
  easeOut(a,b,percent){ return a + (b-a)*(1-Math.pow(1-percent,2));}
  easeInOut(a,b,percent){ return a + (b-a)*((-Math.cos(percent*Math.PI)/2) + 0.5);}

}
