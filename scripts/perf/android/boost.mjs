// GPU clock booster for the emulator benchmark: a headless desktop Chrome that runs a modest WebGL fragment-shader loop so the NVIDIA driver
// leaves its idle power state (P8, about 210-240 MHz) while the emulator renders. Only used for the "boost" condition of bench.mjs ab, to measure
// how much the emulator frame rate depends on the host GPU clock. It changes no Windows or driver setting; stop() kills only the Chrome it started.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {delay, gpuNow} from './benchlib.mjs';

const html = iters => `<!doctype html><canvas id=c width=1280 height=720></canvas><script>
const gl=c.getContext('webgl');const vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const fs='precision highp float;uniform float t;void main(){vec2 u=gl_FragCoord.xy/vec2(1280.,720.);float a=0.;for(int i=0;i<${iters};i++){a+=sin(u.x*float(i)+t)*cos(u.y*float(i)-t);u=fract(u*1.01+a*.01);}gl_FragColor=vec4(vec3(a*.5+.5),1.);}';
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o}
const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const l=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);const tl=gl.getUniformLocation(pr,'t');
(function f(t){gl.uniform1f(tl,t/1000);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);requestAnimationFrame(f)})(0);</script>`;

export async function startBooster({iters = 400, file = 'F:/Vibecode/Orbix/outputs/perf/android/2026-11-18-bench/booster.html'} = {}) {
  await fs.mkdir(path.dirname(file), {recursive: true}); await fs.writeFile(file, html(iters));
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'orbix-boost-'));
  const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--no-first-run', '--user-data-dir=' + profile, '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1280,720', 'file:///' + file], {windowsHide: true, stdio: 'ignore'});
  await delay(6000);
  const g = gpuNow();
  return {gpuAfterStart: g, async stop() { try { proc.kill(); } catch {} await delay(1500); fs.rm(profile, {recursive: true, force: true}).catch(() => {}); }};
}
if (process.argv[2] === 'test') { const b = await startBooster({iters: Number(process.argv[3] || 400)}); console.log(JSON.stringify(b.gpuAfterStart)); await delay(4000); console.log(JSON.stringify(gpuNow())); await b.stop(); await delay(3000); console.log('after stop', JSON.stringify(gpuNow())); }
