// Diff two V8 heap snapshots by constructor: node scripts/perf/heapdiff.mjs a.heapsnapshot b.heapsnapshot [--retainers=Name1,Name2]
import fs from 'node:fs';
const [fa,fb,...rest]=process.argv.slice(2);const opt=Object.fromEntries(rest.map(a=>a.replace(/^--/,'').split('=')));
function load(file){
 const s=JSON.parse(fs.readFileSync(file,'utf8')),m=s.snapshot.meta,nf=m.node_fields.length,ef=m.edge_fields.length;
 const types=m.node_types[0],etypes=m.edge_types[0],N=s.nodes,E=s.edges,S=s.strings;
 const iType=m.node_fields.indexOf('type'),iName=m.node_fields.indexOf('name'),iSize=m.node_fields.indexOf('self_size'),iEdges=m.node_fields.indexOf('edge_count'),iId=m.node_fields.indexOf('id');
 const eType=m.edge_fields.indexOf('type'),eName=m.edge_fields.indexOf('name_or_index'),eTo=m.edge_fields.indexOf('to_node');
 const count=N.length/nf,agg=new Map();
 const key=i=>{const t=types[N[i*nf+iType]];const n=S[N[i*nf+iName]];return t==='object'||t==='native'||t==='closure'?`${t}:${n}`:t==='array'?`array:${n}`:`(${t})`};
 for(let i=0;i<count;i++){const k=key(i);const a=agg.get(k)||[0,0];a[0]++;a[1]+=N[i*nf+iSize];agg.set(k,a)}
 return {s,nf,ef,types,etypes,N,E,S,iType,iName,iSize,iEdges,eType,eName,eTo,count,agg,key};
}
const A=load(fa),B=load(fb);
const rows=[];for(const [k,[c,sz]] of B.agg){const [c0,s0]=A.agg.get(k)||[0,0];rows.push({k,count0:c0,count1:c,dCount:c-c0,dKB:+((sz-s0)/1024).toFixed(1),KB1:+(sz/1024).toFixed(1)})}
const tot=x=>[...x.agg.values()].reduce((s,[,z])=>s+z,0)/1048576;
console.log(`total self size: ${tot(A).toFixed(2)} MB -> ${tot(B).toFixed(2)} MB; nodes ${A.count} -> ${B.count}`);
console.log('\nTop growth by size:');for(const r of rows.sort((a,b)=>b.dKB-a.dKB).slice(0,30))console.log(`${r.dKB.toString().padStart(9)} KB  ${String(r.dCount).padStart(7)} objs  (${r.count0}->${r.count1})  ${r.k}`);
console.log('\nTop growth by count:');for(const r of rows.sort((a,b)=>b.dCount-a.dCount).slice(0,25))console.log(`${String(r.dCount).padStart(7)} objs ${r.dKB.toString().padStart(9)} KB  ${r.k}`);
// Retainer chains for selected constructors in B.
if(opt.retainers){
 const {N,E,S,nf,ef,types,etypes,iEdges,eType,eName,eTo,count}=B;const firstEdge=new Uint32Array(count+1);for(let i=0,e=0;i<count;i++){firstEdge[i]=e;e+=N[i*nf+iEdges]*ef}firstEdge[count]=E.length;
 const ret=new Map();for(let i=0;i<count;i++)for(let e=firstEdge[i];e<firstEdge[i+1];e+=ef){const to=E[e+eTo]/nf;const et=etypes[E[e+eType]];if(et==='weak')continue;(ret.get(to)||ret.set(to,[]).get(to)).push([i,et==='element'||et==='hidden'?'['+E[e+eName]+']':S[E[e+eName]]])}
 const name=i=>`${types[N[i*nf+B.iType]]}:${S[N[i*nf+B.iName]]}`;
 for(const want of opt.retainers.split(',')){
  const ids=[];for(let i=0;i<count;i++)if(S[N[i*nf+B.iName]]===want&&['object','native'].includes(types[N[i*nf+B.iType]]))ids.push(i);
  console.log(`\nRetainers of ${want} (${ids.length} instances), first 3:`);
  for(const id of ids.slice(0,3)){let cur=id,chain=[name(cur)],seen=new Set([cur]);
   for(let d=0;d<12;d++){const r=(ret.get(cur)||[]).find(([p])=>!seen.has(p)&&!/^\(|system/.test(name(p)));if(!r)break;chain.push(`<-${r[1]}- ${name(r[0])}`);cur=r[0];seen.add(cur)}
   console.log('  '+chain.join(' '));}
 }
}
