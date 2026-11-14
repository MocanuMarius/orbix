import assert from 'node:assert/strict';
import test from 'node:test';
import {drawShellArcs} from '../dist/shell-arcs.mjs';

test('capture arcs start together around the visible wisp rim at every flight scale', () => {
  for (const scale of [240/390, 1]) {
    for (const phase of [0, .7, 2, 4]) {
      const roots = [];
      let strokeScale = 1;
      const context = {
        globalAlpha: 1,
        save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, stroke() {}, lineTo() {},
        scale(value) { strokeScale = value; },
        moveTo(x, y) { roots.push({radius: Math.hypot(x,y)*strokeScale, angle: Math.atan2(y,x)}); }
      };
      drawShellArcs(context, 70, 40, scale, 0, 'light', phase);
      assert.ok(roots.length >= 8);
      assert.ok(roots.every(root => Math.abs(root.radius - 11) < .001));
      const angles = roots.map(root => root.angle).sort((a,b) => a-b);
      const gaps = angles.map((angle,i) => (angles[i+1] ?? angles[0]+2*Math.PI) - angle);
      assert.ok(Math.max(...gaps) < Math.PI/3, 'Every side should emit on the first frame');
    }
  }
});
