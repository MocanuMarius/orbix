import * as THREE from './vendor/three.mjs?v=glow-flight-1';
import { PhoenixMotion } from './phoenix-motion.mjs?v=glow-flight-1';

const TAU = Math.PI * 2;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
const color = value => new THREE.Color(value);
const C = {
  root: color('#392a2c'), red: color('#7e3b2b'), orange: color('#b46a34'),
  gold: color('#d8ad61'), ivory: color('#f3dfb1'), shadow: color('#292431'),
};

/** Fine chevron barbs in tangent space, shared by every actual 3D feather. */
function featherNormal() {
  const width = 96, height = 256, pixels = new Uint8Array(width * height * 4);
  const relief = (u, v) => {
    const side = Math.abs(u - .5);
    const shaft = Math.exp(-side * side * 1500) * .07;
    const barbs = Math.sin((v * 56 + side * 13) * TAU) * .014;
    const filaments = Math.sin((v * 131 + side * 37) * TAU) * .003;
    return shaft + barbs + filaments;
  };
  const normal = new THREE.Vector3();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / (width - 1), v = y / (height - 1), d = .002;
    normal.set(-(relief(u + d, v) - relief(u - d, v)) * 15,
      -(relief(u, v + d) - relief(u, v - d)) * 7, 1).normalize();
    const i = (y * width + x) * 4;
    pixels[i] = Math.round((normal.x * .5 + .5) * 255);
    pixels[i + 1] = Math.round((normal.y * .5 + .5) * 255);
    pixels[i + 2] = Math.round((normal.z * .5 + .5) * 255);
    pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** A closed lenticular feather, curved in two axes with a raised central rachis. */
function featherGeometry(length, halfWidth, bend = 0, camber = 1, palette = C) {
  const rings = 18, sides = 10, positions = [], normals = [], uvs = [], colors = [], indices = [];
  const shade = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const profile = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, .76))), .73);
    const width = .025 + halfWidth * profile * (1 - .18 * t);
    const thickness = .045 + halfWidth * .14 * profile;
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * TAU, lateral = Math.cos(angle), front = Math.sin(angle);
      const shaft = Math.exp(-lateral * lateral * 75) * .20 * profile;
      positions.push(bend * t * t + lateral * width, t * length,
        camber * Math.sin(t * Math.PI) + front * (thickness + shaft));
      normals.push(0, 0, 1);
      uvs.push((lateral + 1) * .5, t);
      const edge = Math.pow(Math.abs(lateral), 5);
      shade.copy(palette.root).lerp(palette.red, clamp(t * 1.4, 0, 1));
      shade.lerp(palette.orange, clamp((t - .25) * .8, 0, .65));
      shade.lerp(palette.gold, clamp((t - .72) * 3.1, 0, .75));
      shade.lerp(palette.ivory, edge * .14 + Math.exp(-lateral * lateral * 170) * .17);
      shade.multiplyScalar(front < 0 ? .78 : 1);
      colors.push(shade.r, shade.g, shade.b);
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function tubeGeometry(points, radiusAt, segments = 25, radial = 12, warm = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const frames = curve.computeFrenetFrames(segments, false);
  const positions = [], uvs = [], colors = [], indices = [];
  const point = new THREE.Vector3(), offset = new THREE.Vector3(), shade = new THREE.Color();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, point);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * TAU, radius = radiusAt(t);
      offset.copy(frames.normals[i]).multiplyScalar(Math.cos(a) * radius)
        .addScaledVector(frames.binormals[i], Math.sin(a) * radius);
      positions.push(point.x + offset.x, point.y + offset.y, point.z + offset.z);
      uvs.push(j / radial, t);
      shade.copy(warm ? C.gold : C.root).lerp(warm ? C.ivory : C.orange, warm ? t * .75 : t * .5);
      colors.push(shade.r, shade.g, shade.b);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ellipsoid(parent, material, position, scale) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function plume(parent, material, options) {
  const { length, width, bend = 0, camber = .8, at = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = options;
  const mesh = new THREE.Mesh(featherGeometry(length, width, bend, camber), material);
  mesh.position.set(...at);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function emberEdge(parent, material, length, width, bend, at, rotation) {
  const points = [];
  for (let i = 0; i <= 16; i++) {
    const t = .45 + i / 16 * .54;
    const profile = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, .76))), .73);
    points.push(new THREE.Vector3(bend * t * t - width * profile * (1 - .18 * t), t * length, .6 * Math.sin(t * Math.PI) + .12));
  }
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, .09, 4, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...at);
  mesh.rotation.set(...rotation);
  parent.add(mesh);
}

/** Merge only static meshes sharing a bone and material; primary feather joints remain live. */
function mergeStaticTree(parent, dynamic) {
  for (const child of [...parent.children]) if (child.isGroup) mergeStaticTree(child, dynamic);
  const batches = new Map();
  for (const mesh of parent.children) if (mesh.isMesh && !dynamic.has(mesh)) {
    const batch = batches.get(mesh.material) || [];
    batch.push(mesh);
    batches.set(mesh.material, batch);
  }
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const sources = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const names = Object.keys(sources[0].attributes).filter(name => sources.every(g => g.getAttribute(name)));
    const merged = new THREE.BufferGeometry();
    const totalVertices = sources.reduce((n, g) => n + g.getAttribute('position').count, 0);
    for (const name of names) {
      const itemSize = sources[0].getAttribute(name).itemSize;
      const data = new Float32Array(totalVertices * itemSize);
      let offset = 0;
      for (const source of sources) {
        data.set(source.getAttribute(name).array, offset);
        offset += source.getAttribute(name).array.length;
      }
      merged.setAttribute(name, new THREE.BufferAttribute(data, itemSize));
    }
    const indices = [];
    let offset = 0;
    for (const source of sources) {
      const vertexCount = source.getAttribute('position').count;
      if (source.index) for (const index of source.index.array) indices.push(index + offset);
      else for (let i = 0; i < vertexCount; i++) indices.push(i + offset);
      offset += vertexCount;
      source.dispose();
    }
    merged.setIndex(indices);
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = 'Merged contour plumage';
    for (const source of meshes) { parent.remove(source); source.geometry.dispose(); }
    parent.add(mesh);
  }
}

export class Phoenix3D {
  constructor() {
    this.destroyed = false;
    this.motion = new PhoenixMotion();
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(480, 480, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-90, 90, 90, -90, .1, 1000);
    this.camera.position.set(0, 0, 300);
    this.camera.lookAt(0, 0, 0);
    Object.assign(this, createPhoenixModel());
    this.scene.add(this.root);

    this.scene.add(new THREE.HemisphereLight(0xb9d3f0, 0x482735, 1.05));
    const moon = new THREE.DirectionalLight(0xd5e7ff, 3.1);
    moon.position.set(55, 100, 170);
    this.scene.add(moon);
    const rim = new THREE.DirectionalLight(0xf5b775, 1.25);
    rim.position.set(-90, 35, -140);
    this.scene.add(rim);
    this.fireLight = new THREE.PointLight(0xff872e, 3200, 220, 2);
    this.fireLight.position.set(-34, -24, 48);
    this.scene.add(this.fireLight);

    this.render({ player: { vy: 0 }, lastFlapTime: -1000, boostTime: 0, flame: 100 }, 0);
  }

  buildBody() {
    const torso = ellipsoid(this.root, this.bodyMaterial, [-4, 0, 0], [25, 9.2, 8.4]);
    torso.rotation.z = .05;
    ellipsoid(this.root, this.bodyMaterial, [11, 3, 0], [13, 7.8, 7.3]);
    const neck = new THREE.Mesh(tubeGeometry([[11, 3.5, 0], [18, 5.6, 0], [24, 9.4, 0], [30.5, 12, 0]], t => 5.9 - t * 2.4, 27), this.neckMaterial);
    this.root.add(neck);
    // Overlapping contour feathers follow the curved breast and back instead of a smooth toy shell.
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) {
        const x = -21 + i * 4.4 + row % 2 * 1.5, y = -6.2 + row * 3.65;
        const z = Math.sqrt(Math.max(.10, 1 - (x / 28) ** 2 - (y / 12) ** 2)) * 8.3 * side;
        plume(this.root, side > 0 ? this.featherMaterial : this.farMaterial, {
          length: 5.6 + row * .35, width: 1.55, bend: -.6, camber: .28,
          at: [x, y, z], rotation: [side * .08, side * .15, 1.92 + row * .04],
        });
      }
      for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) {
        const t = i / 6;
        plume(this.root, this.featherMaterial, { length: 6.4 - t * 1.2, width: 1.35,
          bend: -.85, camber: .30, at: [15 + t * 16, 3.7 + t * 8.7 + row * 1.35, side * (4.9 - t * .85) + side * Math.sin(row / 2 * Math.PI) * .55],
          rotation: [side * .12, side * .18, 1.97 - t * .13] });
      }
    }
    // Fine folded legs are tucked into the warm belly.
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(tubeGeometry([[-2, -7, side * 4], [3, -12, side * 4], [9, -12.5, side * 4]], t => .72 - .25 * t, 12, 7, true), this.beakMaterial);
      this.root.add(leg);
      for (let toe = 0; toe < 2; toe++) {
        const claw = new THREE.Mesh(tubeGeometry([[8, -12.3, side * 4], [12, -12.8, side * 4 + toe - .5], [13, -14, side * 4 + toe - .5]], t => .34 * (1 - t) + .035, 8, 5, true), this.beakMaterial);
        this.root.add(claw);
      }
    }
  }

  buildHead() {
    const head = ellipsoid(this.root, this.bodyMaterial, [32, 12.5, 0], [8.8, 4.75, 4.45]);
    head.rotation.z = .02;
    const upperBeak = new THREE.Mesh(tubeGeometry([[38.4, 12.2, 0], [42.2, 12.7, 0], [45.3, 11.7, 0], [46.2, 10.2, 0]], t => 1.75 * (1 - t) ** .8 + .035, 22, 12, true), this.beakMaterial);
    const lowerBeak = new THREE.Mesh(tubeGeometry([[38.7, 10.6, 0], [42.2, 10.3, 0], [44.7, 10.35, 0]], t => .85 * (1 - t) + .025, 17, 10, true), this.beakMaterial);
    this.root.add(upperBeak, lowerBeak);
    for (const side of [-1, 1]) {
      ellipsoid(this.root, this.darkMaterial, [35.9, 14.2, side * 3.8], [1.25, .72, .45]);
      ellipsoid(this.root, this.irisMaterial, [36.05, 14.17, side * 4.18], [.62, .57, .25]);
      ellipsoid(this.root, this.darkMaterial, [36.2, 14.18, side * 4.36], [.22, .40, .12]);
      ellipsoid(this.root, this.glintMaterial, [36.18, 14.42, side * 4.45], [.12, .115, .065]);
      const brow = plume(this.root, this.featherMaterial, { length: 6.1, width: .82, bend: .4,
        at: [37.2, 14.95, side * 3.85], rotation: [0, side * .1, 1.34] });
      brow.scale.z = .6;
      ellipsoid(this.root, this.darkMaterial, [41, 12.5, side * 1.15], [.26, .17, .10]);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
        const x = 26.5 + i * 1.7, y = 10.7 + row * 1.6;
        const z = Math.sqrt(Math.max(.08, 1 - ((x - 32) / 9.2) ** 2 - ((y - 12.5) / 5.2) ** 2)) * 4.35 * side;
        if (x > 34 && row === 2) continue;
        plume(this.root, this.featherMaterial, { length: 3.8, width: .85, bend: -.35, camber: .2,
          at: [x, y, z], rotation: [0, side * .12, 1.88] });
      }
    }
    this.crest = new THREE.Group();
    this.crest.position.set(27.5, 15.5, 0);
    this.root.add(this.crest);
    for (let i = 0; i < 6; i++) plume(this.crest, this.featherMaterial, {
      length: 12 + Math.sin(i / 5 * Math.PI) * 5, width: 1.1 + i * .025,
      bend: -2.5, camber: .6, at: [-i * .62, .15, (i - 2.5) * .7],
      rotation: [0, (i - 2.5) * .08, .93 + i * .07],
    });
  }

  buildWing(side) {
    const material = side > 0 ? this.featherMaterial : this.farMaterial;
    const shoulder = new THREE.Group();
    shoulder.position.set(-.5, 4.3, side * 6.8);
    this.root.add(shoulder);
    const elbow = new THREE.Group();
    elbow.position.set(-6.5, 17, 0);
    shoulder.add(elbow);
    const wrist = new THREE.Group();
    wrist.position.set(-3.5, 16, 0);
    elbow.add(wrist);

    // A visible raised leading edge anchors the layered flight feathers.
    const upper = new THREE.Mesh(tubeGeometry([[0, 0, 0], [-1.5, 10, .3], [-6.5, 18, 0]], t => 3.8 - t * 1.6, 18, 10), material);
    shoulder.add(upper);
    const forearm = new THREE.Mesh(tubeGeometry([[0, 0, 0], [-.5, 9, .2], [-3.5, 17, 0]], t => 2.25 - t * 1.3, 17, 9), material);
    elbow.add(forearm);

    for (let i = 0; i < 7; i++) {
      const at = [-1 - i * .5, i * 2.1, .5];
      plume(elbow, material, { length: 17 + i * .45, width: 2.55,
        bend: -2.2 - i * .18, camber: 1.1, at, rotation: [.03, .03, .96 - i * .055] });
    }
    const primaries = [];
    for (let i = 0; i < 9; i++) {
      const length = 24 + Math.sin(i / 8 * Math.PI) * 8 - i * .62;
      const rotation = [.025 * i, -.015 * i, -.13 + i * .115];
      const at = [-i * .78, -i * .30, .1 + i * .075];
      const mesh = plume(wrist, material, { length, width: 2.35 - i * .04,
        bend: -2.2 - i * .34, camber: 1.25, at, rotation });
      primaries.push({ mesh, base: [...rotation], index: i });
      if (i === 0 || i === 4 || i === 8) emberEdge(wrist, this.edgeMaterial, length, 2.35 - i * .04, -2.2 - i * .34, at, rotation);
    }
    // Three staggered covert layers conceal the joints and give the wing real volume.
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
      plume(row < 2 ? shoulder : elbow, material, {
        length: 8.5 + row * 1.6, width: 2.05, bend: -1.5, camber: .75,
        at: [-1.1 - i * 2 - row * .5, i * 2.1 + (row === 1 ? 5 : 0), 2.2 - row * .12],
        rotation: [.03, 0, .82 + row * .08],
      });
    }
    return { shoulder, elbow, wrist, primaries, side };
  }

  buildTail() {
    const tails = [];
    for (let i = 0; i < 9; i++) {
      const centered = (i - 4) / 4;
      const base = new THREE.Group();
      base.position.set(-19, -1.8 + Math.abs(centered) * .4, centered * 4.3);
      base.rotation.z = Math.PI / 2 + centered * .14;
      this.root.add(base);
      plume(base, this.featherMaterial, { length: 15, width: 2.7, bend: centered * 1.8, camber: .6 });
      const tip = new THREE.Group();
      tip.position.set(centered * .8, 12.3, 0);
      base.add(tip);
      const length = 43 - Math.abs(centered) * 13;
      const bend = centered * 4 + 2;
      plume(tip, this.featherMaterial, { length, width: 2.9 - Math.abs(centered) * .4, bend, camber: 1.1 });
      if (i % 2 === 0) emberEdge(tip, this.edgeMaterial, length, 2.9 - Math.abs(centered) * .4, bend, [0, 0, 0], [0, 0, 0]);
      tails.push({ base, tip, centered, index: i, rotation: base.rotation.z });
    }
    return tails;
  }

  render(engine = {}, time) {
    if (this.destroyed) return;
    const t = Number.isFinite(time) ? time : engine.visualTime ?? engine.time ?? 0;
    const pose = this.motion.update(engine, t);
    const bank = clamp(Number(engine.visualBank) || (engine.player?.vy || 0) / 900, -.45, .45);
    this.root.position.y = pose.heave * .55;
    this.root.rotation.set(.075 + Math.sin(t * 1.1) * .018, -.10 + bank * .36 + Math.sin(t * .9) * .025, -bank * .04);
    for (const wing of [this.nearWing, this.farWing]) {
      const joint = wing.side > 0 ? pose.shoulder : pose.farShoulder;
      const downstroke = clamp((-joint - .03) / 1.6, 0, 1);
      wing.shoulder.rotation.x = wing.side * (.08 + downstroke * 2.45);
      wing.shoulder.rotation.z = -.08 + pose.elbow * .18;
      wing.elbow.rotation.z = -.16 - pose.elbow * .8;
      wing.elbow.rotation.y = wing.side * (.10 + pose.elbow * .34);
      wing.wrist.rotation.z = -.04 - pose.wrist * .8;
      wing.wrist.rotation.y = wing.side * (.08 + Math.sin(t * 4.2) * .025);
      wing.wrist.scale.x = pose.fold;
      wing.wrist.scale.y = .88 + pose.fold * .12;
      for (const primary of wing.primaries) {
        primary.mesh.rotation.y = primary.base[1] + Math.sin(t * 6 - primary.index * .48) * .018;
        primary.mesh.rotation.z = primary.base[2] + Math.sin(t * 5.4 - primary.index * .35) * .008;
      }
    }
    for (const tail of this.tailBones) {
      const wave = Math.sin(t * (pose.boost ? 8 : 4.8) - tail.index * .52);
      tail.base.rotation.z = tail.rotation + wave * .035 - pose.tail * .15;
      tail.base.rotation.x = tail.centered * .12 + Math.sin(t * 3.6 - tail.index * .44) * .045;
      tail.tip.rotation.z = wave * .085 - pose.tail * .18;
      tail.tip.rotation.x = Math.sin(t * 4.4 - tail.index * .6) * .08;
    }
    this.crest.rotation.z = Math.sin(t * 4.1) * .025 - pose.tail * .035;
    this.featherMaterial.emissiveIntensity = pose.boost ? .14 : .04;
    this.edgeMaterial.opacity = pose.boost ? .54 : .28;
    this.fireLight.intensity = pose.boost ? 3600 : 2000;
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const geometries = new Set(), materials = new Set();
    this.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) if (material) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.normalTexture.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}

/** DOM-free anatomical model. Renderers and tests can share the same live bone hierarchy. */
export function createPhoenixModel() {
  const model = { root: new THREE.Group(), normalTexture: featherNormal() };
  model.root.name = 'Emberwing · articulated 3D phoenix';
  model.featherMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, roughness: .73, metalness: .045,
    normalMap: model.normalTexture, normalScale: new THREE.Vector2(.37, .28),
    sheen: .22, sheenRoughness: .78, sheenColor: color('#d9a66d'),
    clearcoat: .01, emissive: 0x9c3b13, emissiveIntensity: .04,
  });
  model.farMaterial = model.featherMaterial.clone();
  model.farMaterial.color.set('#9e9699');
  model.farMaterial.emissiveIntensity = .02;
  model.bodyMaterial = new THREE.MeshPhysicalMaterial({ color: '#70412f', roughness: .84, metalness: .025,
    normalMap: model.normalTexture, normalScale: new THREE.Vector2(.16, .12), sheen: .18, sheenColor: color('#d2a66b') });
  model.neckMaterial = model.featherMaterial.clone();
  model.neckMaterial.roughness = .79;
  model.beakMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .56, metalness: .10 });
  model.darkMaterial = new THREE.MeshStandardMaterial({ color: '#241f24', roughness: .76, metalness: .04 });
  model.irisMaterial = new THREE.MeshStandardMaterial({ color: '#efc36d', emissive: '#f9b64c', emissiveIntensity: .7, roughness: .42 });
  model.glintMaterial = new THREE.MeshBasicMaterial({ color: '#e5f5ff' });
  model.edgeMaterial = new THREE.MeshBasicMaterial({ color: '#ed9c49', transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false });
  model.farWing = Phoenix3D.prototype.buildWing.call(model, -1);
  Phoenix3D.prototype.buildBody.call(model);
  model.nearWing = Phoenix3D.prototype.buildWing.call(model, 1);
  Phoenix3D.prototype.buildHead.call(model);
  model.tailBones = Phoenix3D.prototype.buildTail.call(model);
  const dynamic = new Set([...model.nearWing.primaries, ...model.farWing.primaries].map(primary => primary.mesh));
  mergeStaticTree(model.root, dynamic);
  model.stats = { meshCount: 0, triangleCount: 0, vertexCount: 0 };
  model.root.traverse(object => {
    if (!object.isMesh) return;
    model.stats.meshCount++;
    model.stats.vertexCount += object.geometry.getAttribute('position').count;
    model.stats.triangleCount += (object.geometry.index?.count || object.geometry.getAttribute('position').count) / 3;
  });
  return model;
}
