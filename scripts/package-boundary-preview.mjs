// Publish a complete real-game snapshot beneath a new pathname. Older offline
// workers cannot substitute their root-scoped game/illustration cache entries.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,relative,join,isAbsolute} from 'node:path';
const publishedRoot=resolve(process.argv[2]||'work/pages-release-collector');
const source=await readFile(join(publishedRoot,'offline-list.js'),'utf8');
const manifest=JSON.parse(source.slice(source.indexOf('=')+1).trim().replace(/;\s*$/,''));
const folder='previews/flight-edges-live-1';
const destination=join(publishedRoot,folder);
for(const file of manifest.files){
 const input=resolve(publishedRoot,file),output=resolve(destination,file);
 for(const [root,path] of [[publishedRoot,input],[destination,output]]){
  const rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))throw Error('Invalid snapshot path');
 }
 await mkdir(resolve(output,'..'),{recursive:true});
 await copyFile(input,output);
}
let shell=await readFile(join(destination,'boundary-preview.html'),'utf8');
shell=shell.replace('class="back" href="./"','class="back" href="../../"');
await writeFile(join(destination,'index.html'),shell);
await writeFile(join(destination,'release.json'),JSON.stringify({release:manifest.release,revision:manifest.revision,source:'Actual Wispbound App + WispFlight',files:manifest.files.length},null,2)+'\n');
console.log(`Published isolated playable preview: ${folder}/ (${manifest.files.length} files)`);
