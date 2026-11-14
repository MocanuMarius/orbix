import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {drawPickup, drawSparkSymbol, prepareFuelSprites, pickupArtSvg, pickupSpriteFrame, sparkRasterMetrics} from '../dist/pickup-art.mjs';
import {resourceSymbol} from '../dist/game-symbols.mjs';
import {getPickupSpec, pickupContactRadius, pickupShellRadius} from '../dist/pickups.mjs';
import {glowPoints} from '../dist/vitality.mjs';

const kinds = ['light', 'cluster', 'cache'];

function atlasFixture() {
  const sprites = [];
  const doc = {createElement() {
    const sprite = {};
    const ctx = {globalAlpha: 1, save(){}, restore(){}, clearRect(){sprite.pixels=undefined;}, fillRect(x, y, w, h) {
      sprite.pixels ??= Buffer.alloc(sprite.width * sprite.height * 4);
      const color = Number.parseInt(this.fillStyle.slice(1), 16);
      const alpha = this.globalAlpha;
      for (let yy = Math.max(0,y); yy < Math.min(sprite.height,y + h); yy++) {
        for (let xx = Math.max(0,x); xx < Math.min(sprite.width,x + w); xx++) {
          const i = (yy * sprite.width + xx) * 4;
          const behind = sprite.pixels[i+3] / 255 * (1-alpha);
          const blended = alpha + behind;
          for (let c = 0; c < 3; c++) {
            const channel = (color >> (16 - 8*c)) & 255;
            sprite.pixels[i+c] = Math.round((channel*alpha + sprite.pixels[i+c]*behind) / blended);
          }
          sprite.pixels[i+3] = Math.round(blended*255);
        }
      }
    }};
    sprite.getContext = () => ctx;
    sprites.push(sprite);
    return sprite;
  }};
  const ctx = {canvas:{ownerDocument:doc}, globalAlpha:1, save(){}, restore(){}, drawImage(sprite){this.last = sprite;}};
  return {doc, sprites, ctx};
}

function images(markup) {
  return [...markup.matchAll(/href="([^"?]+)(?:\?[^"]*)?"/g)].map(match => match[1]);
}

// The game's asset baker writes full-size RGBA frames with one unfiltered row
// per scanline. Read both timing and pixels from the shipped animation.
async function decodeAsset(file) {
  const png = await readFile(new URL('../dist/' + file, import.meta.url));
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  const frames = [];
  let delay = 0;
  for (let i = 8; i < png.length;) {
    const length = png.readUInt32BE(i);
    const type = png.toString('ascii',i+4,i+8);
    const data = png.subarray(i+8,i+8+length);
    if (type === 'fcTL') delay = data.readUInt16BE(20) / (data.readUInt16BE(22) || 100);
    if (type === 'IDAT' || type === 'fdAT') {
      const rows = inflateSync(type === 'fdAT' ? data.subarray(4) : data);
      const stride = 1 + width * 4;
      assert.equal(rows.length, stride * height);
      const rgba = Buffer.alloc(width * height * 4);
      for (let y = 0; y < height; y++) {
        assert.equal(rows[y*stride],0);
        rows.copy(rgba,y*width*4,y*stride+1,(y+1)*stride);
      }
      frames.push({delay, rgba});
    }
    i += 12 + length;
  }
  assert.ok(frames.length);
  return {width,height,frames};
}

function assertSameFrame(sprite,asset,frame,message) {
  const offsetX = (sprite.width - asset.width)/2, offsetY = (sprite.height - asset.height)/2;
  for (let y = 0; y < asset.height; y++) {
    const start = 4 * ((y+offsetY)*sprite.width + offsetX);
    const expected = asset.frames[frame].rgba.subarray(4*y*asset.width,4*(y+1)*asset.width);
    assert.ok(sprite.pixels.subarray(start,start+4*asset.width).equals(expected),message + ' row ' + y);
  }
}

test('Spark artwork shrinks while contact radii and fuel yields are preserved', () => {
  const sparkKinds=[...kinds,'dusk','dark'];
  assert.deepEqual(sparkKinds.map(pickupShellRadius), [16,16,16,20,17.6].map(r=>r*.8));
  assert.deepEqual(sparkKinds.map(pickupContactRadius), [20.8,20.8,24,20,17.6]);
  assert.equal(pickupShellRadius('sight'), 20.8);
  assert.deepEqual(kinds.map(k => glowPoints(getPickupSpec(k).fuel)), [6,12,18]);
});

test('absorption starts from the live Spark texture, including both warning variants', () => {
  const {ctx,doc}=atlasFixture();
  for (const kind of [...kinds,'dusk','dark']) {
    const opts={time:1.71,phase:1.6};
    drawPickup(ctx,10,10,{kind,...opts});
    assert.equal(pickupSpriteFrame(doc,kind,opts), ctx.last);
  }
});

test('large Spark frames sample the screen grid and reuse bounded canvases across sizes and phases', () => {
  const surfaces=new Set();
  const doc={createElement(){
    const canvas={};
    const context={
      canvas,clearRect(){},fillRect(){},save(){},restore(){},translate(){},scale(){},beginPath(){},arc(){},fill(){},
      stroke(){},moveTo(){},lineTo(){},createRadialGradient(){return {addColorStop(){}};}
    };
    canvas.getContext=()=>context;
    surfaces.add(canvas);
    return canvas;
  }};
  for(let frame=0;frame<60;frame++){
    for(const [kind,massTier,scale] of [['cache',10,5.2],['dark',6,2.3],['dark',10,11.9]]){
      const options={time:frame/25,scale,massTier,bodyOnly:frame%3===0};
      const sprite=pickupSpriteFrame(doc,kind,options);
      assert.ok(Math.abs(scale/sprite.sparkTexelScale-1)<.12,'detail stays close to one projected pixel');
      assert.equal(sprite,pickupSpriteFrame(doc,kind,options));
    }
  }
  assert.ok(surfaces.size<=16,'fuel and dark atlases each retain at most eight large surfaces');
});

test('the Flash Powerup uses the same white triangle and halo in the field and menus', async () => {
  const {ctx}=atlasFixture();
  const [still,motion]=await Promise.all(images(pickupArtSvg('sight')).map(decodeAsset));
  drawPickup(ctx,0,0,{kind:'sight',time:0,reducedMotion:true});
  assertSameFrame(ctx.last,still,0,'quiet Flash');
  let time=0;
  for(const [i,frame] of motion.frames.entries()) {
    drawPickup(ctx,0,0,{kind:'sight',time:time+frame.delay/2});
    assertSameFrame(ctx.last,motion,i,'moving Flash '+i);
    let brightest=0, haloPixels=0;
    for(let p=0;p<frame.rgba.length;p+=4) {
      const [r,g,b,a]=frame.rgba.subarray(p,p+4);
      if(!a)continue;
      assert.equal(r,g);
      assert.equal(g,b);
      brightest=Math.max(brightest,Math.min(r,a));
      if(a<150)haloPixels++;
    }
    assert.equal(brightest,255);
    assert.ok(haloPixels>20);
    time+=frame.delay;
  }
  assert.ok(motion.frames.some(f=>!f.rgba.equals(motion.frames[0].rgba)));
});

test('the menu, its wallet window and canvas labels use the scaled flight Spark', () => {
  const fuelImages = images(pickupArtSvg('light'));
  assert.equal(fuelImages.length, 2);
  assert.deepEqual(images(resourceSymbol('energy')), fuelImages);
  assert.deepEqual(images(resourceSymbol('glow')), fuelImages);
  assert.deepEqual(images(resourceSymbol('packed')), fuelImages);
  assert.doesNotMatch(resourceSymbol('energy'), /\sid=/);
  const {ctx} = atlasFixture();
  for (const reducedMotion of [true,false]) {
    for (const time of [.12,1.73,4.26]) {
      drawPickup(ctx,10,10,{kind:'light',time,reducedMotion});
      const regular = ctx.last;
      for (const size of [8,16,35]) {
        drawSparkSymbol(ctx,10,10,{size,time,reducedMotion});
        assert.ok(ctx.last.pixels.some(value=>value),'the symbol remains the shared animated plasma material');
        assert.equal(ctx.imageSmoothingEnabled,false,'scaling never adds a smooth-only Spark variant');
        assert.equal(ctx.last.sparkTexelScale,sparkRasterMetrics(size/44).density);
      }
    }
  }
});

test('flight and menu use the same animated Spark, and cargo carries its shell-free interior', async () => {
  const {ctx,doc,sprites} = atlasFixture();
  await prepareFuelSprites(doc);
  await prepareFuelSprites(doc,true);
  const warmed = sprites.length;
  for (const kind of kinds) {
    const [stillFile, motionFile] = images(pickupArtSvg(kind));
    const [still, motion] = await Promise.all([decodeAsset(stillFile),decodeAsset(motionFile)]);
    assert.equal(still.frames.length,1);
    drawPickup(ctx,10,10,{kind,time:0,reducedMotion:true});
    const quietSprite = ctx.last;
    assertSameFrame(quietSprite,still,0,kind+' quiet');
    drawPickup(ctx,10,10,{kind,time:5.6,reducedMotion:true});
    assert.equal(ctx.last,quietSprite);

    drawPickup(ctx,10,10,{kind,time:1,phase:0});
    const neighbors = ctx.last;
    drawPickup(ctx,10,10,{kind,time:1,phase:Math.PI});
    assert.notEqual(neighbors,ctx.last,'neighboring Sparks can play different discharge phases');
    drawPickup(ctx,10,10,{kind,time:1,phase:Math.PI,reducedMotion:true});
    assert.equal(ctx.last,quietSprite);

    assert.equal(motion.frames.length,120);
    assert.ok(motion.frames.every(frame => frame.delay === .04),kind+' plays at 25 frames per second');
    const samples = new Set([0,.08,.41,.74,1].map(t => Math.round(t*(motion.frames.length-1))));
    let time = 0;
    for (const [i,frame] of motion.frames.entries()) {
      if (samples.has(i)) {
        drawPickup(ctx,10,10,{kind,time:time+frame.delay/2});
        const normal = ctx.last;
        assertSameFrame(normal,motion,i,kind+' frame '+i);
        drawPickup(ctx,10,10,{kind,time:time+frame.delay/2,tiny:true,bodyOnly:true});
        const interior = pickupSpriteFrame(doc,kind,{time:time+frame.delay/2,bodyOnly:true});
        assert.equal(ctx.last,interior);
        assert.notDeepEqual(interior.pixels,normal.pixels,'the shell stays behind at collection');
      }
      time += frame.delay;
    }
    const unique = new Set([...samples].map(i=>motion.frames[i].rgba.toString('base64')));
    assert.ok(unique.size>=4,kind+' should vary throughout the longer animation');
  }
  assert.equal(sprites.length,warmed,'drawing ordinary, carried and quiet Sparks reuses the warmed sprite bank');
});
