import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSS_PREVIEWS, buildBossLayout, getGuardianForMap} from '../dist/boss.mjs';
import {circleHitsObstacle, WispFlight} from '../dist/flight.mjs';
import {getFlightLengthProfile} from '../dist/level-length.mjs';
import {insideShutter,shutterPhase,shutterDensityAt,shutterLightFactor,shutterWakeAt} from '../dist/shutter-cone.mjs';
import {inLanternRoom,lanternPassageY,lanternRoute} from '../dist/lantern-layout.mjs';
import {lightVisibility} from '../dist/light-field.mjs';

const dt = 1/120;

function flight(id, {speed = 1, role = 'collector', difficulty = 1, duration = 90, mapIndex = 0} = {}) {
  const ctx = new Proxy({}, {get(object, key) {
    return object[key] ??= String(key).includes('Gradient') ? () => ({addColorStop() {}}) : () => {};
  }});
  const canvas = {style:{}, bounds:{width:900,height:405}, getContext:()=>ctx, getBoundingClientRect() { return this.bounds; }};
  const engine = new WispFlight({canvas, boss: true, bossId: id, duration, seed: 'guardian-contact',
    difficulty, mapIndex, row: 6, companions: [role], modifiers: {speed}});
  engine.render = () => {};
  // Remove unrelated rewards and zone hazards. Each test keeps real guardian geometry,
  // camera, fixed-step movement, protection and collision resolution.
  engine.layout.embers = [];
  engine.biomeDynamics.items = [];
  engine.blackHoles.items = [];
  engine.drafts.zones = engine.drafts.zones.filter(zone => zone.guardian);
  return engine;
}

function place(engine, worldX, y) {
  engine.distance = engine.previousDistance = worldX - engine.player.x;
  engine.player.y = engine.previousPlayerY = y;
  engine.player.vy = 0;
}

function stepAt(engine, worldX, y) {
  place(engine, worldX - engine.baseSpeed * dt, y);
  engine.step(dt);
}

test('Hollow Sun route flights use paired lanterns and an accessible Flash without starting a guardian fight',()=>{
  const canvas={style:{},getContext:()=>({setTransform(){}}),getBoundingClientRect:()=>({width:900,height:405})};
  for(const [row,elite,count] of [[0,false,1],[3,false,2],[5,false,3],[3,true,3]]){
    const e=new WispFlight({canvas,preflight:true,node:{row,mapTheme:'darkness-lanterns'},
      elite,terrain:'canopy',seed:7,duration:64});
    const field=e.layout.lanternEncounter;
    assert.equal(e.bossEncounter,false);
    assert.equal(e.layout.boss,undefined);
    assert.equal(field.rooms.length,count);
    assert.ok(e.layout.embers.filter(p=>p.harmful).every(p=>!inLanternRoom(e.layout,p.x,25)));
    assert.ok(e.layout.riskChains.every(chain=>
      !inLanternRoom(e.layout,(chain.start+chain.end)/2,(chain.end-chain.start)/2)));
    const flash=e.flashProps.find(p=>p.feature==='lantern-flash');
    assert.ok(flash.x<field.rooms.at(-1).x && e.objectiveBodyClear(flash.x,flash.y,21));
    for(const room of field.rooms){
      const lanterns=field.shutters.filter(s=>s.room===room);
      assert.deepEqual(lanterns.map(s=>s.side),[-1,1]);
      let overlap=0;
      for(let x=room.x;x<room.x+room.width*1.8;x+=8){
        const y=lanternPassageY(room,x);
        assert.ok(e.objectiveBodyClear(x,y,17));
        overlap=Math.max(overlap,Math.min(...lanterns.map(s=>shutterDensityAt(s,x,y,x,field.speed))));
      }
      assert.ok(overlap>.5);
    }
    const s=field.shutters[0];
    place(e,s.openX+field.speed*.9,s.y);
    const x=s.x+s.shift*.45, y=s.y-s.side*s.depth*.45;
    assert.ok(lightVisibility(e,{intensity:1,edgingReveal:1},x-e.distance,y)<.9);
  }
  const other=new WispFlight({canvas,preflight:true,node:{row:3},elite:true,terrain:'storm',seed:7,duration:64});
  assert.equal(other.layout.lanternEncounter,undefined);
});

test('guardian order is seeded and spans three different encounters', () => {
  for (let seed = 1; seed < 100; seed++) {
    const ids = [0, 1, 2].map(i => getGuardianForMap(seed, i).id);
    assert.equal(new Set(ids).size, 3);
    assert.deepEqual(ids, [0, 1, 2].map(i => getGuardianForMap(seed, i).id));
  }
  assert.equal(Object.keys(BOSS_PREVIEWS).length, 6);
});

test('each guardian fits its campaign length', () => {
  const bands = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const profile = getFlightLengthProfile({seed});
    bands.add(profile.lengthBand);
    const ranges = {short:[45,70], standard:[80,110], endurance:[120,150]};
    const [low, high] = ranges[profile.lengthBand];
    assert.ok(profile.duration >= low && profile.duration <= high);
  }
  assert.equal(bands.size, 3);
  assert.deepEqual([0, 1, 2].map(mapIndex => getFlightLengthProfile({boss:true,mapIndex}).duration), [90,120,150]);
});

test('both late crests use real two-sided terrain and leave a traversable opening', () => {
  for(const id of Object.keys(BOSS_PREVIEWS)){
    for(const difficulty of [1,3,6]){
      const e=flight(id,{difficulty}),boss=e.layout.boss;
      assert.deepEqual(boss.crests.map(o=>o.bossPhase),[2,3]);
      for(const crest of boss.crests){
        const x=crest.x+crest.width*.65;
        const attack=boss.attacks?.find(a=>a.obstacle===crest);
        if(boss.attacks)assert.ok(attack,'late crest must use its guardian device');
        for(const time of [0,1.5,3,4.5]){
          const center=crest.center+Math.sin(time*.9+crest.phase)*crest.motion;
          assert.ok(!circleHitsObstacle(x,center,e.player.radius+12,crest,time),'room for imperfect positioning');
          for(const side of [-1,1]){
            assert.ok(circleHitsObstacle(x,center+side*(crest.gap/2+28),e.player.radius,crest,time));
          }
        }
      }
      e.destroy();
    }
  }
});

test('every Hollow Sun lantern room has playable crossfire and the final rock bend requires a turn',()=>{
  for(const height of [430,620,850])for(const difficulty of [1,3,6]){
    const layout=buildBossLayout({height,difficulty,bossId:'hollow-sun',duration:90});
    const boss=layout.boss;
    const single=boss.shutters.filter(s=>s.group==='single');
    const relay=boss.shutters.filter(s=>s.group==='relay');
    const finale=boss.shutters.filter(s=>s.crossfire);
    assert.deepEqual(single.map(s=>[s.phase,s.side]),[[2,-1]]);
    assert.deepEqual(boss.shutters.filter(s=>s.phase===2).map(s=>s.side),[-1,1]);
    assert.deepEqual(relay.map(s=>s.side),[-1,1,-1,1]);
    assert.deepEqual(finale.map(s=>s.side),[-1,1]);
    assert.ok(relay.every((s,i)=>s.phase===3 && (!i || s.openX>relay[i-1].openX)));
    const flash=layout.embers.find(p=>p.feature==='crossfire-flash');
    assert.equal(flash.kind,'sight');
    assert.ok(flash.x>relay.at(-1).x && flash.x<finale[0].x);
    for (const s of boss.shutters) assert.ok(!insideShutter(s,flash.x,flash.y));
    assert.ok(layout.obstacles.every(o=>!circleHitsObstacle(flash.x,flash.y,20,o,0)));
    for(const s of boss.shutters){
      assert.ok(!layout.obstacles.find(o=>o.id===s.obstacleId).motion);
      assert.ok((s.openX-s.warningX)/boss.speed>=1.9);
      assert.equal(shutterPhase(s,s.warningX-1),0);
      assert.equal(shutterPhase(s,s.openX-1),1);
      assert.equal(shutterPhase(s,s.openX),2);
    }
    for(const room of new Set(boss.shutters.map(s=>s.room))){
      const pair=boss.shutters.filter(s=>s.room===room);
      assert.deepEqual(pair.map(s=>s.side),[-1,1]);
      let overlap=0,longest=0;
      for(let x=room.x-20;x<room.x+room.width*1.9;x+=3){
        const y=lanternPassageY(room,x);
        const crossed=pair.every(s=>shutterDensityAt(s,x,y,x,boss.speed)>.20);
        overlap=crossed ? overlap+3 : 0;
        if(crossed)assert.ok(layout.obstacles.every(o=>!circleHitsObstacle(x,y,14,o,0)));
        longest=Math.max(longest,overlap);
      }
      assert.ok(longest>=21,'two active beams overlap across at least one full wisp diameter on the flyable center line');
    }
    const finalRoom=finale[0].room;
    const lowTurn=lanternPassageY(finalRoom,finalRoom.x+finalRoom.width*.1);
    const highTurn=lanternPassageY(finalRoom,finalRoom.x+finalRoom.width*1.55);
    assert.ok(lowTurn-highTurn>height*.21);
    if(height===430){
      for(let y=0;y<=height;y+=.5){
        assert.ok([.1,1.55].some(f=>circleHitsObstacle(finalRoom.x+f*finalRoom.width,y,9.35,finalRoom,0)),
          'a wisp holding a fixed altitude cannot cross both mouths of the landscape bend');
      }
    }
    for(const lanterns of [single,finale])for(const route of ['near','wide']){
      const {startX,startY,focusX,y}=lanternRoute(lanterns,route);
      const hit=lanterns.filter(s=>{
        const across=(s.y-y)*s.side/s.depth;
        return Math.abs(focusX-s.x-s.shift*across)<s.spread*across;
      });
      assert.equal(hit.length,lanterns===finale&&route==='wide'?2:1);
      for(const o of layout.obstacles)for(const sway of [-1,1]){
        assert.ok(!circleHitsObstacle(startX,startY??y,14,o,0,o.center+sway*o.motion));
        assert.ok(!circleHitsObstacle(focusX,y,14,o,0,o.center+sway*o.motion));
      }
    }
  }
});

test('map depth adds linked opposite gates with reachable lanes and time to change altitude',()=>{
  for(const id of Object.keys(BOSS_PREVIEWS))for(const mapIndex of [0,1,2]){
    const e=flight(id,{mapIndex,duration:[90,120,150][mapIndex]});
    const boss=e.layout.boss,linked=boss.crests.filter(o=>o.guardianLane);
    assert.equal(boss.mapIndex,mapIndex);
    assert.deepEqual(linked.map(o=>o.bossPhase),[[],[3,3],[2,2,3,3]][mapIndex]);
    for(let i=0;i<linked.length;i+=2){
      const [a,b]=linked.slice(i,i+2);
      assert.equal(a.guardianLane,-b.guardianLane);
      assert.equal(b.id,a.id+1);
      assert.ok((b.x-a.x)/e.baseSpeed>1.9);
      assert.ok(Math.abs(a.center-b.center)>e.height*.12);
      for(const o of [a,b]){
        const x=o.x+o.width*.65;
        assert.equal(o.cacheEligible,false);
        for(const t of [0,1.6,3.2,4.8])for(const other of e.layout.obstacles){
          assert.ok(!circleHitsObstacle(x,o.center,e.player.radius+8,other,t),id+' marked lane is blocked');
        }
        const attack=boss.attacks?.find(at=>at.obstacle===o);
        if(boss.attacks)assert.ok(attack);
        if(attack?.stormZone){
          const jet=attack.stormZone;
          assert.equal(jet.direction,-o.guardianLane);
          assert.ok(Math.abs(jet.y-o.center)>jet.ry,'the marked center lane stays outside the jet');
        }
        if(id==='frost-matron'||id==='hollow-sun')assert.equal(attack.side,-o.guardianLane);
        for(const shutter of boss.shutters||[]){
          const across=Math.max(0,(shutter.y-o.center)*shutter.side/shutter.depth);
          assert.ok(Math.abs(x-shutter.x-shutter.shift*across)>shutter.spread*across+100);
        }
      }
    }
    e.destroy();
  }
});

test('lantern darkness fades with distance, layers in crossfire and opens locally for Luminance and Flash',()=>{
  const e=flight('hollow-sun'),boss=e.layout.boss,s=boss.shutters[0];
  const y=s.y-s.side*s.depth*.55,x=s.x+s.shift*.55;
  const fullReveal={...e.getLightState(),edgingReveal:1};
  place(e,s.openX-1,y);
  assert.equal(lightVisibility(e,fullReveal,x-e.distance,y),1);
  const openedX=s.openX+boss.speed*.65;
  place(e,openedX,y);
  assert.ok(lightVisibility(e,fullReveal,x-e.distance,y)<.85);
  // Continue past the opposing rock face into the last row of the viewport.
  const edgeY=s.side===-1?e.height-1:1;
  const left=Math.atan((s.shift-s.spread)/s.depth),right=Math.atan((s.shift+s.spread)/s.depth);
  const single={speed:boss.speed,shutters:[s]};
  const at=(fraction,worldY=edgeY,chamber=single)=>{
    const ray=left+(right-left)*fraction;
    const worldX=s.x+Math.tan(ray)*Math.abs(worldY-s.y);
    return shutterLightFactor(chamber,worldX,worldY,openedX,y);
  };
  const near=at(.5,s.y-s.side*22);
  const middle=at(.5,(s.y+edgeY)/2);
  const far=at(.5);
  assert.ok(near<.07&&near<middle&&middle<far&&far<.99,
    `light transmitted near/halfway/at viewport edge: ${near}, ${middle}, ${far}`);
  assert.ok(far<at(.86)&&at(.86)<at(.94)&&at(.94)<1);
  assert.equal(at(1.02),1);
  const pair={speed:boss.speed,shutters:[s,{...s,x:s.x+12}]};
  const overlap=at(.5,edgeY,pair);
  assert.ok(overlap<far-.01,'two distant beams cast a deeper shadow together');
  place(e,x,y);
  assert.equal(lightVisibility(e,fullReveal,x-e.distance,y),1);
  // Sample well inside the dark region at five visible body radii, using
  // actual flight light states before and after the upgrades and pickup.
  const reach=5*15;
  const pointX=e.player.x, pointY=y-s.side*reach;
  const sight=()=>lightVisibility(e,e.getLightState(),pointX,pointY);
  const base=sight();
  const ordinaryRadius=e.mod.lightRadius;
  e.mod.lightRadius=225;
  const max=sight();
  e.mod.lightRadius=ordinaryRadius;
  e.collect({kind:'sight',x,y,phase:0});
  e.time+=3;
  const flash=sight();
  assert.ok(max>base+.10,`max Luminance ${max} vs base ${base}`);
  assert.ok(flash>base+.10&&flash>.18,`Flash ${flash} vs base ${base}`);
  const fuel=e.flame;
  for(let i=0;i<80;i++)stepAt(e,x,y);
  assert.equal(e.flame,fuel);
  assert.equal(e.collisions,0);
  e.destroy();
});

test('the wisp casts a widening region of restored light behind it, relative to each individual lantern',()=>{
  const roof={x:0,y:0,side:-1,depth:280,shift:0,spread:284,openX:-200};
  const floor={...roof,x:70,y:410,side:1};
  const single={shutters:[roof],speed:154};
  const light={baseRadius:145,radius:145,intensity:1};
  const at=(x,y,px=0,boss=single)=>shutterLightFactor(boss,x,y,px,80,light);
  const wake=(x,y,px=0)=>shutterWakeAt(single,x,y,px,80,9.35,light);
  assert.equal(wake(0,30),0,'rock on the lamp side of the wisp gets no wake');
  assert.ok(wake(0,230)>.20,'the wake restores the rock behind the wisp');
  assert.equal(wake(0,230,65),0,'moving the wisp sideways releases the former shadow');
  assert.ok(wake(36,280)>wake(36,140)+.1,'the wedge widens farther from the lamp');
  assert.ok(at(0,230)>at(0,230,65)+.25);
  const crossfire={...single,shutters:[roof,floor]};
  assert.ok(at(0,230,0,crossfire)<at(0,230)-.1,'another lantern still reaches this patch of rock');
});

for (const id of ['moonweaver','hollow-warden']) {
  test(`${id} solids hit on either side, its moving opening clears`, () => {
    for (const side of [-1, 1]) {
      for (const inside of [false, true]) {
        const e = flight(id);
        const o = e.layout.obstacles.find(o => o.motion && o.topShape && o.bottomShape);
        assert.ok(o);
        const t = Math.PI / 2;
        e.time = t - dt;
        const worldX = o.x + o.width * .65;
        const center = o.center + Math.sin(t * .9 + o.phase) * o.motion;
        const y = inside ? center + side * (o.gap / 2 + 12) : center;
        stepAt(e, worldX, y);
        assert.equal(e.dying, inside);
        assert.equal(o.hit, inside);
        e.destroy();
      }
    }
  });
}

test('a Rootbound gate turns an initially legal edge into a collision and preserves its center lane', () => {
  const survey = flight('rootbound-heart');
  const first = survey.layout.boss.attacks[0], x = first.x;
  let open = {gap:0}, shut = {gap:Infinity};
  for (let frame = 0; frame < 720; frame++) {
    stepAt(survey, x, first.center);
    const gap = first.obstacle.gap, t = survey.time;
    if (gap > open.gap) open = {gap,t};
    if (gap < shut.gap) shut = {gap,t};
  }
  assert.ok(open.gap - shut.gap > 12, 'a player can read and use the change');
  const obstacle = first.obstacle;
  const collides = (y, phase) => circleHitsObstacle(x, y, survey.player.radius,
    {...obstacle, gap:phase.gap}, phase.t);
  const edge = Array.from({length:Math.ceil(first.baseGap)}, (_, i) => first.center - first.baseGap/2 + i)
    .find(y => !collides(y, open) && collides(y, shut));
  assert.ok(Number.isFinite(edge));
  for (const [y,t,hit] of [[edge,open.t,false],[edge,shut.t,true],[first.center,shut.t,false]]) {
    const e = flight('rootbound-heart');
    e.time = t - dt;
    stepAt(e, x, y);
    assert.equal(e.dying, hit);
    e.destroy();
  }
  survey.destroy();
});


test('Hollow Sun drains Energy by distance, independently of terrain damage', () => {
  function measure(lane) {
    const e = flight('hollow-sun');
    const a = e.layout.boss.attacks[0];
    e.time = 2;
    stepAt(e, a.x - 8, a.center);
    const start = e.flame;
    for (let i = 0; i < 36; i++) {
      const y = lane === 'core' ? a.wellY : lane === 'other side' ? a.center - a.side * 36 : e.height/2;
      stepAt(e, lane === 'outside' ? a.x - 290 : a.x, y);
    }
    const loss = start - e.flame;
    assert.equal(e.collisions, 0);
    e.destroy();
    return loss;
  }
  const near = measure('core'), opposite = measure('other side'), distant = measure('outside');
  assert.ok(near > opposite * 2 && opposite > 0);
  assert.equal(distant, 0);
});

test('Frost shards warn, collide from the advertised side, leave an escape, and can be shielded', () => {
  for (const speed of [.8, 1, 1.25]) {
    const base = flight('frost-matron', {speed});
    const attacks = base.layout.boss.attacks;
    const sample = [...new Set([attacks[0].index, attacks.find(a => a.side !== attacks[0].side).index, attacks.at(-1).index])];
    base.destroy();
    for (const attackIndex of sample) {
      const observe = (lane, role='collector', initialEnergy=100, aegis=false) => {
        const e = flight('frost-matron', {speed,role});
        e.flame=initialEnergy;
        e.proximityShieldRemaining=aegis?3:0;
        const a = e.layout.boss.attacks[attackIndex];
        place(e, a.x - 235, a.center);
        let firstWarning, firstActive, crossY;
        while (e.distance + e.player.x < a.x + 26 && !e.dying) {
          const worldX = e.distance + e.player.x;
          const near = Math.abs(a.x - worldX) < 26;
          const safeY = a.center - a.side * a.baseGap * .24;
          e.player.y = near && lane !== null ? lane : safeY;
          e.player.vy = 0;
          e.step(dt);
          if (!a.iceActive && a.iceProgress === 0) firstWarning ??= e.time;
          if (a.iceActive) firstActive ??= e.time;
          if (Math.abs(a.x - (e.distance + e.player.x)) < e.baseSpeed * dt && a.iceActive) crossY = a.iceY;
        }
        const result = {crossY, firstWarning, firstActive, dying:e.dying, collisions:e.collisions,
          charges:e.shield.charges, remaining:e.flame, spent:a.spent, aegis:e.proximityShieldRemaining};
        e.destroy();
        return result;
      };
      const bypass = observe(null);
      assert.equal(bypass.collisions, 0, JSON.stringify({speed,attackIndex,bypass}));
      assert.ok(Number.isFinite(bypass.crossY), 'ice occupies a visible danger lane as the orb passes, including fast approaches');
      assert.ok(bypass.firstActive - bypass.firstWarning >= .4, 'the warning precedes the active shard');
      assert.equal(bypass.remaining,100);
      assert.equal(bypass.spent,false);
      for (const start of [100,9,0]) {
        const contact = observe(bypass.crossY,'collector',start);
        assert.equal(contact.dying,false);
        assert.equal(contact.spent,true);
        assert.equal(contact.collisions,1,'shards count once toward the clean-flight challenge');
        assert.equal(contact.remaining,Math.max(0,start-20),'one shard costs six displayed Energy, capped by the amount held');
      }
      const defended = observe(bypass.crossY, 'protector');
      assert.equal(defended.dying, false);
      assert.equal(defended.collisions, 1);
      assert.equal(defended.charges, 0);
      assert.equal(defended.remaining,88,'Protector pays its usual deflection cost');
      const aegis=observe(bypass.crossY,'collector',100,true);
      assert.equal(aegis.aegis,0);
      assert.equal(aegis.remaining,100);
      assert.equal(aegis.dying,false);
    }
  }
});


test('Storm columns move the wisp in both directions with a traversable bypass', () => {
  function crossing(speed, index, bypass, suppress, dash = false) {
    const e = flight('storm-shepherd',{speed,role:dash?'swift':'collector'});
    const a = e.layout.boss.attacks[index], z = a.stormZone;
    assert.ok(e.drafts.zones.includes(z));
    if (suppress) e.drafts.zones = [];
    place(e, z.x - z.rx * .55, bypass ? z.y + z.direction * (z.ry + 22) : z.y);
    if (dash) {
      e.fleet[0].remaining = 1;
      e.syncFleetTimers();
    }
    // Compare from the same altitude and velocity over the active half of a column.
    e.player.vy = -32;
    const startY = e.player.y;
    let experienced = false;
    while (e.distance + e.player.x < z.x + z.rx * .16) {
      e.step(dt);
      experienced ||= a.stormContact;
      assert.equal(e.dying, false, JSON.stringify({speed,index,bypass,suppress,dash}));
    }
    const result = {dy:e.player.y - startY, experienced, dir:z.direction, gustSeconds:e.gustSeconds};
    e.destroy();
    return result;
  }
  for (const speed of [1,1.25]) {
    const directions = [];
    for (const index of [0,1]) {
      const control = crossing(speed,index,false,true), gust = crossing(speed,index,false,false);
      const safe = crossing(speed,index,true,false), safeControl = crossing(speed,index,true,true);
      assert.ok(gust.experienced && gust.gustSeconds > .1);
      assert.ok((gust.dy - control.dy) * gust.dir > 8, 'the active lane changes the unaided path by at least a body radius');
      assert.equal(safe.experienced, false);
      assert.equal(safe.gustSeconds, 0);
      assert.equal(safe.dy, safeControl.dy);
      directions.push(gust.dir);
      const dash = crossing(speed,index,false,false,true), dashControl = crossing(speed,index,false,true,true);
      assert.ok(Math.abs(dash.dy-dashControl.dy) < Math.abs(gust.dy-control.dy) * .5);
    }
    assert.equal(directions[0], -directions[1]);
  }
});

test('changing orientation keeps guardian threats attached to the same part of the passage', () => {
  for (const id of ['frost-matron','storm-shepherd','rootbound-heart','hollow-sun']) {
    const e = flight(id), a = e.layout.boss.attacks[0], oldHeight = e.height;
    const old = {center:a.center,gap:a.baseGap,y:a.stormZone?.y??a.wellY??a.iceY??a.center};
    e.canvas.bounds = {width:412,height:915};
    e.resize();
    const factor = e.height / oldHeight;
    assert.ok(factor > 1.4);
    assert.equal(a.center, old.center*factor);
    assert.equal(a.center, a.obstacle.center);
    assert.equal(a.baseGap, old.gap*factor);
    assert.equal(a.stormZone?.y??a.wellY??a.iceY??a.center, old.y*factor);
    e.destroy();
  }
});

test('the early Moonweaver teaches both crescent lanes before their crests', () => {
  for (const difficulty of [1,2]) {
    const layout = buildBossLayout({bossId:'moonweaver',duration:90,height:430,difficulty});
    const pair = layout.obstacles.slice(0,2);
    const loom = layout.obstacles.find(o => o.bossPhase === 2 && o.motion > 0);
    assert.ok(pair[0].bottomShape && !pair[0].topShape);
    assert.ok(pair[1].topShape && !pair[1].bottomShape);
    for (const o of [...pair,loom]) {
      const spark = layout.embers.find(p => p.feature === 'silver-thread' && p.anchor === o.id);
      assert.ok(spark);
      assert.ok((o.x + o.width*.64 - spark.x) / 154 >= .5);
      for (const other of layout.obstacles) {
        for(const sway of [-1,1])assert.ok(!circleHitsObstacle(spark.x,spark.y,18,other,0,other.center+sway*other.motion));
      }
      assert.ok(Math.abs(spark.y - 215) < Math.abs(o.center - 215));
    }
  }
});
