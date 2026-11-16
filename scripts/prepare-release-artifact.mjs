// Package committed source without touching the active checkout, index or remotes.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const args=new Map();for(let i=2;i<process.argv.length;i+=2){assert.ok(process.argv[i].startsWith('--')&&process.argv[i+1], 'Expected --commit REF --release NAME --out DIRECTORY');args.set(process.argv[i].slice(2),process.argv[i+1]);}
assert.ok([...args.keys()].every(k=>['commit','release','out'].includes(k)),'Unknown option');
const release=args.get('release'),output=args.get('out');assert.match(release||'',/^[a-z0-9][a-z0-9-]{1,63}$/);assert.ok(output,'--out required');
const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim(),git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:256*1024*1024});
const commit=git(['rev-parse','--verify',(args.get('commit')||'HEAD')+'^{commit}']).trim(),out=path.resolve(output),artifact=path.join(out,'artifact');
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Output must be a fresh empty directory; existing evidence is never deleted');await fs.mkdir(artifact);
const archive=path.join(out,'source.tar');git(['-c','core.autocrlf=false','archive','--format=tar','-o',archive,commit]);execFileSync('tar',['-xf',archive,'-C',artifact]);
const game=await fs.readFile(path.join(artifact,'dist/game.html'),'utf8'),old=/src="app\.mjs\?v=([^"]+)"/.exec(game)?.[1];assert.ok(old,'Expected entry release token');assert.notEqual(old,release,'Use a fresh release name');
async function list(dir){let files=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);files.push(...e.isDirectory()?await list(f):[f]);}return files;}
const stamp=s=>s.replaceAll('?v='+old,'?v='+release).replaceAll("'"+old+"'","'"+release+"'").replaceAll('"'+old+'"','"'+release+'"');let stamped=0;
for(const f of await list(path.join(artifact,'dist'))){if(!/\.(mjs|js|html|css|webmanifest|json|svg|txt|md)$/.test(f)||f.endsWith('offline-list.js'))continue;const a=await fs.readFile(f,'utf8'),b=stamp(a);if(a!==b){await fs.writeFile(f,b);stamped++;}}
execFileSync(process.execPath,['scripts/pwa-assets.mjs'],{cwd:artifact,stdio:'inherit'});const ctx={};vm.runInNewContext(await fs.readFile(path.join(artifact,'dist/offline-list.js'),'utf8')+';this.offline=WISP_OFFLINE',ctx);assert.equal(ctx.offline.release,release);
const hashes={};for(const f of ctx.offline.files){const bytes=await fs.readFile(path.join(artifact,'dist',f));hashes[f]=createHash('sha256').update(bytes).digest('hex');}
const metadata={version:release,sourceCommit:commit,preparedAt:new Date().toISOString()};await fs.writeFile(path.join(artifact,'dist/release.json'),JSON.stringify(metadata,null,2)+'\n');
const report={passed:true,sourceCommit:commit,release,previousSourceToken:old,artifact,stamped,offlineFiles:ctx.offline.files.length,revision:ctx.offline.revision,hashes,remoteWrites:false,activeCheckoutWrites:false};await fs.writeFile(path.join(out,'package-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,hashes:undefined}));
