import * as PIXI from './vendor/pixi.mjs?v=guardian-paths-1';
import { PhoenixMotion, deformWing, deformTail } from './phoenix-motion.mjs?v=guardian-paths-1';

export class PhoenixRig {
  constructor(texture) {
    this.container = new PIXI.Container(); this.motion = new PhoenixMotion(); this.frames = [];
    const width = texture.width / 2, height = texture.height / 2;
    for (let i = 0; i < 4; i++) this.frames.push(new PIXI.Texture({ source: texture.source,
      frame: new PIXI.Rectangle((i % 2) * width, Math.floor(i / 2) * height, width, height) }));
    this.farWing = this.mesh(this.frames[2], 19, 15, 475, 400, .13);
    this.farWing.tint = 0xd0a473; this.farWing.alpha = .84;
    this.farWing.position.set(-3, -6);
    this.tail = this.mesh(this.frames[3], 21, 9, 495, 95, .13);
    this.tail.position.set(-19, 3);
    this.body = new PIXI.Sprite(this.frames[0]);
    this.body.anchor.set(280 / 512, 350 / 512); this.body.scale.set(72 / width, 72 / height);
    this.nearWing = this.mesh(this.frames[1], 19, 15, 470, 435, .15);
    this.nearWing.position.set(-5, -3);
    this.container.addChild(this.farWing, this.tail, this.body, this.nearWing);
  }

  mesh(texture, verticesX, verticesY, hingeX, hingeY, scale) {
    const mesh = new PIXI.MeshPlane({ texture, verticesX, verticesY });
    mesh.autoResize = false;
    const buffer = mesh.geometry.getAttribute('aPosition').buffer;
    mesh.base = new Float32Array(buffer.data.length);
    for (let i = 0; i < mesh.base.length; i += 2) {
      mesh.base[i] = (buffer.data[i] / texture.width * 512 - hingeX) * scale;
      mesh.base[i + 1] = (buffer.data[i + 1] / texture.height * 512 - hingeY) * scale;
    }
    return mesh;
  }

  render(engine, time) {
    const pose = this.motion.update(engine, time);
    for (const [wing, far] of [[this.nearWing, false], [this.farWing, true]]) {
      const buffer = wing.geometry.getAttribute('aPosition').buffer;
      deformWing(wing.base, buffer.data, pose, far); buffer.update();
    }
    const tail = this.tail.geometry.getAttribute('aPosition').buffer;
    deformTail(this.tail.base, tail.data, pose); tail.update();
    this.body.y = pose.heave;
    this.body.rotation = -pose.tail * .025;
    this.container.y = pose.heave * .25;
  }

  destroy() {
    this.container.destroy({ children: true });
    this.frames.forEach(frame => frame.destroy(false)); this.frames = [];
  }
}
