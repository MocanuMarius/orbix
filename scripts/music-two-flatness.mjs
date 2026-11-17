// Quick spectral-flatness pass over every piece (flow level, 60 s), for the noise-bed check.
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {chrome,until} from './browser-probe.mjs';
const PORT=4241,base=`http://127.0.0.1:${PORT}`,label=process.argv[2]||'now';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:'ignore',windowsHide:true});
let browser;
try{
 await until(async()=>(await fetch(base+'/design-lab/music.html')).ok,'server');
 browser=await chrome(['--autoplay-policy=no-user-gesture-required']);
 await browser.visit(base+'/design-lab/music.html');await until(()=>browser.ev('!!window.__musicLab'),'lab');
 const rows=await browser.ev(`import('/design-lab/music-measure.mjs').then(async m=>{const out=[];for(const id of ['moss','pines','ferry','paper']){const r=[];for(const level of [0,1,2]){const {buffer}=await m.renderScore(id,{level,seconds:30,startBar:8});const ch=buffer.getChannelData(0);r.push({level,...m.levels(buffer),...m.spectrum(ch)});}out.push({id,levels:r.map(x=>({level:x.level,rms:x.rmsDb,peak:x.peakDb,bands:x.bands,flatness:x.flatness,flatnessHigh:x.flatnessHigh}))});}return out;})`);
 await fs.mkdir('outputs/music-audit',{recursive:true});await fs.writeFile(`outputs/music-audit/flatness-${label}.json`,JSON.stringify(rows,null,1));
 console.log(JSON.stringify(rows));
}finally{browser?.close();server.kill();}
