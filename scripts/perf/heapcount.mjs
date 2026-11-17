// Count instances of named constructors in heap snapshots and print one retainer path.
// node scripts/perf/heapcount.mjs <snapshot> Name1,Name2
import fs from 'node:fs';
const [file,names]=process.argv.slice(2);const want=new Set(names.split(','));
const s=JSON.parse(fs.readFileSync(file,'utf8')),m=s.snapshot.meta,nf=m.node_fields.length,ef=m.edge_fields.length,N=s.nodes,E=s.edges,S=s.strings,T=m.node_types[0],ET=m.edge_types[0];
const iT=m.node_fields.indexOf('type'),iN=m.node_fields.indexOf('name'),iE=m.node_fields.indexOf('edge_count'),eT=m.edge_fields.indexOf('type'),eN=m.edge_fields.indexOf('name_or_index'),eTo=m.edge_fields.indexOf('to_node');
const count=N.length/nf,ret=new Map();let e=0;
for(let i=0;i<count;i++){const n=N[i*nf+iE];for(let k=0;k<n;k++,e+=ef){const to=E[e+eTo]/nf,et=ET[E[e+eT]];if(et==='weak')continue;const nm=et==='element'||et==='hidden'?'['+E[e+eN]+']':S[E[e+eN]];(ret.get(to)||ret.set(to,[]).get(to)).push([i,nm,et])}}
const name=i=>`${T[N[i*nf+iT]]}:${S[N[i*nf+iN]].slice(0,60)}`;
for(const w of want){const ids=[];for(let i=0;i<count;i++)if(S[N[i*nf+iN]]===w&&T[N[i*nf+iT]]==='object')ids.push(i);
 console.log(`${w}: ${ids.length}`);
 for(const id of ids.slice(0,2)){ // breadth-first to a GC root-ish node
  const prev=new Map([[id,null]]),q=[id];let found=null;
  while(q.length&&!found){const c=q.shift();for(const [p,nm,et] of ret.get(c)||[]){if(prev.has(p))continue;prev.set(p,[c,nm,et]);const pn=name(p);if(/synthetic:\(GC roots\)|synthetic:\(Document DOM trees\)|Window \/|native:Window|object:Window/.test(pn)){found=p;break}q.push(p)}}
  const chain=[];let c=found;while(c!=null&&c!==id){const [child,nm,et]=prev.get(c);chain.push(`${name(c)} -${nm}->`);c=child}
  console.log('  path: '+(found!=null?chain.join(' ')+' '+name(id):'(no root found)'));
 }}
