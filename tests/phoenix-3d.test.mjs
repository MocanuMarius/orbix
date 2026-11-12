import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.mjs';
import { createPhoenixModel, Phoenix3D } from '../dist/phoenix-3d.mjs';
import { PhoenixMotion } from '../dist/phoenix-motion.mjs';

function inspect(model) {
  const geometries = new Set(), materials = new Set();
  let meshes = 0, triangles = 0;
  model.root.traverse(object => {
    if (!object.isMesh) return;
    meshes++;
    geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) materials.add(material);
    triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
  });
  return { meshes, triangles, geometries, materials };
}

function dispose(model) {
  const resources = inspect(model);
  for (const geometry of resources.geometries) geometry.dispose();
  for (const material of resources.materials) material.dispose();
  model.normalTexture.dispose();
}

test('the DOM-free phoenix is volumetric, finite, articulated, and within its mobile draw budget', () => {
  const model = createPhoenixModel();
  try {
    assert.equal(THREE.REVISION, '187');
    assert.ok(model.root.isObject3D);
    const resources = inspect(model);
    assert.ok(resources.meshes > 20, 'the model contains separately articulated anatomy');
    assert.ok(resources.meshes <= 80, `static coverts remain merged: ${resources.meshes} draws`);
    assert.ok(resources.triangles < 125_000, `${resources.triangles} triangles stay within the authored budget`);
    for (const geometry of resources.geometries) {
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      assert.ok(positions?.count > 0);
      assert.equal(normals?.count, positions.count, 'shaded geometry has a normal for each vertex');
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        assert.ok(Array.from(attribute.array).every(Number.isFinite), `${name} remains finite after merging`);
      }
      if (geometry.index) assert.ok(Array.from(geometry.index.array).every(index => index < positions.count));
    }
    const bounds = new THREE.Box3().setFromObject(model.root);
    assert.ok(bounds.max.z - bounds.min.z > 20, 'anatomy has actual depth rather than a flat textured plane');
    assert.ok(model.nearWing.shoulder.position.z > 0);
    assert.ok(model.farWing.shoulder.position.z < 0);
    assert.equal(model.nearWing.wrist.parent, model.nearWing.elbow);
    assert.equal(model.nearWing.elbow.parent, model.nearWing.shoulder);
    assert.ok(model.tailBones.length >= 5);
    assert.ok(model.normalTexture.isDataTexture);
    assert.equal(model.featherMaterial.normalMap, model.normalTexture);
  } finally { dispose(model); }
});

test('601 flight, Boost and glide poses stay in the model camera without mutating gameplay', () => {
  const model = createPhoenixModel();
  let renders = 0;
  model.scene = new THREE.Scene();
  model.scene.add(model.root);
  model.camera = new THREE.OrthographicCamera(-90, 90, 90, -90, .1, 1000);
  model.motion = new PhoenixMotion();
  model.fireLight = { intensity: 0 };
  model.renderer = { render() { renders++; } };
  let largestExtent = 0;
  try {
    for (let frame = 0; frame <= 600; frame++) {
      const time = frame / 120;
      const engine = Object.freeze({ player: Object.freeze({ vy: Math.sin(time) * 200 }),
        lastFlapTime: time > 4 ? 3.9 : Math.floor(time / 1.3) * 1.3,
        boostTime: time > 2 && time < 3 ? .5 : 0,
        flame: time > 4 ? 0 : 100, visualBank: Math.sin(time) * .3, time });
      const before = JSON.stringify(engine);
      Phoenix3D.prototype.render.call(model, engine, time);
      assert.equal(JSON.stringify(engine), before, '3D animation is presentation-only');
      const box = new THREE.Box3().setFromObject(model.root);
      largestExtent = Math.max(largestExtent, Math.abs(box.min.x), Math.abs(box.max.x),
        Math.abs(box.min.y), Math.abs(box.max.y));
      assert.ok(largestExtent < 89.5, `pose ${frame} clips the ±90 camera: ${largestExtent}`);
      model.root.traverse(object => {
        assert.ok(object.matrixWorld.elements.every(Number.isFinite), 'joint transforms remain finite');
      });
    }
    assert.equal(renders, 601);
  } finally { dispose(model); }
});
