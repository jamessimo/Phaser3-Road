export default class renderHelpers {
  constructor(scene) {

    this.scene = scene;
    this.COLORS = {
      SKY: "0x72D7EE",
      TREE: "0x005108",
      FOG: "0x4b692f",
      LIGHT: {
        road: "0x6B6B6B",
        grass: "0x10AA10",
        rumble: "0xfb6262",
        lane: "0xCCCCCC"
      },
      DARK: {
        road: "0x696969",
        grass: "0x009A00",
        rumble: "0xe9e9e9"
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
    this.WIREFRAME = false;
  }

  renderSegment(width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {

    let
      r1 = this.scene.utils.rumbleWidth(w1, lanes),
      r2 = this.scene.utils.rumbleWidth(w2, lanes),
      l1 = this.scene.utils.laneMarkerWidth(w1, lanes),
      l2 = this.scene.utils.laneMarkerWidth(w2, lanes),
      lanew1, lanew2, lanex1, lanex2, lane;

    //DRAW GRASS

    if (!this.WIREFRAME) {
      this.scene.graphics.fillStyle(color.grass);
      this.scene.graphics.fillRect(0, y2, width, y1 - y2);
    }

    //DRAW RUMBLE
    this.renderPolygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble, fog);
    this.renderPolygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble, fog);
    this.renderPolygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

    if (color.lane) {
      lanew1 = w1 * 2 / lanes;
      lanew2 = w2 * 2 / lanes;
      lanex1 = x1 - w1 + lanew1;
      lanex2 = x2 - w2 + lanew2;
      for (lane = 1; lane < lanes; lanex1 += lanew1, lanex2 += lanew2, lane++)
        this.renderPolygon(lanex1 - l1 / 2, y1, lanex1 + l1 / 2, y1, lanex2 + l2 / 2, y2, lanex2 - l2 / 2, y2, color.lane, fog);
    }
    this.renderFog(0, y1, width, y2 - y1, fog);

  }
  renderRect(x, y, width, height, color, fog) {
    let rect = new Phaser.Geom.Rectangle(x, y, width, height, color);
    this.scene.graphics.fillStyle(color, fog);
    this.scene.graphics.fillRectShape(rect);
  }
  renderPolygon(x1, y1, x2, y2, x3, y3, x4, y4, color, fog) {
    let polygon = new Phaser.Geom.Polygon([
      x1, y1,
      x2, y2,
      x3, y3,
      x4, y4
    ]);
    if (!this.WIREFRAME) {
      this.scene.graphics.fillStyle(color, 1);
      this.scene.graphics.fillPoints(polygon.points, true);
    } else {
      this.scene.graphics.lineStyle(2, 0x9600ff, 1); //opacity - 1
      this.scene.graphics.beginPath();
      this.scene.graphics.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (let i = 1; i < polygon.points.length; i++) {
        this.scene.graphics.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      this.scene.graphics.closePath();
      this.scene.graphics.strokePath();
    }
  }
  renderFog(x, y, width, height, fog) {
    if (fog < 1) {
      this.renderRect(x, y, width, height, this.COLORS.FOG, 1 - fog)
    }
  }
}
