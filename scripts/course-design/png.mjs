// Minimal RGB raster + PNG writer for course silhouette strips (no deps).
import zlib from 'node:zlib';
import fs from 'node:fs';

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length); return out;
}
export const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export class Raster {
  constructor(w, h, bg = '#0d1420') { this.w = w; this.h = h; this.data = Buffer.alloc(w * h * 3); this.rect(0, 0, w, h, bg); }
  set(x, y, rgb) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const o = (y * this.w + x) * 3; this.data[o] = rgb[0]; this.data[o + 1] = rgb[1]; this.data[o + 2] = rgb[2]; }
  rect(x, y, w, h, color) { const rgb = typeof color === 'string' ? hex(color) : color; for (let j = Math.max(0, y); j < Math.min(this.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(this.w, x + w); i++) this.set(i, j, rgb); }
  /** Even-odd scanline fill of a polygon given in pixel coordinates. */
  polygon(points, color, clip = [0, 0, this.w, this.h]) {
    const rgb = typeof color === 'string' ? hex(color) : color;
    const ys = points.map(p => p[1]); const y0 = Math.max(clip[1], Math.floor(Math.min(...ys))), y1 = Math.min(clip[3] - 1, Math.ceil(Math.max(...ys)));
    for (let y = y0; y <= y1; y++) {
      const sy = y + .5, xs = [];
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[j], b = points[i];
        if ((a[1] > sy) !== (b[1] > sy)) xs.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.max(clip[0], Math.round(xs[k])), to = Math.min(clip[2], Math.round(xs[k + 1]));
        for (let x = from; x < to; x++) this.set(x, y, rgb);
      }
    }
  }
  write(file) {
    const raw = Buffer.alloc((this.w * 3 + 1) * this.h);
    for (let y = 0; y < this.h; y++) { raw[y * (this.w * 3 + 1)] = 0; this.data.copy(raw, y * (this.w * 3 + 1) + 1, y * this.w * 3, (y + 1) * this.w * 3); }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(this.w, 0); ihdr.writeUInt32BE(this.h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  }
}

/** Wrap a course into stacked rows at true aspect (1 px = `k` units). */
export function stripLayout(length, { k = 4, rowLength = 4600, frame = 620, pad = 8 } = {}) {
  const rows = Math.max(1, Math.ceil(length / rowLength)), rowH = Math.round(frame / k);
  return { rows, rowH, k, rowLength, pad, w: Math.round(rowLength / k) + pad * 2, h: rows * (rowH + pad) + pad };
}
