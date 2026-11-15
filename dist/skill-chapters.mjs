// Shared by the model's prerequisite graph and the skill book. No model import:
// chapter boundaries must govern real purchases, not only presentation.
export function skillBookChapter(skill){
 if(skill.treeTab==='companion')return 'companion';
 if(skill.branch==='proximity')return 'proximity';
 if(skill.branch==='afterglow'||['main-afterglow','main-clear-dividend'].includes(skill.id))return 'packing';
 if(skill.treeGroup==='main-dream')return 'dream';
 if(['main-sight','main-glow-sense','main-long-flash','main-resonant-harvest','main-resonant-purification','main-resonant-bounty'].includes(skill.treeGroup||skill.id))return 'luminance';
 return 'wisp';
}
export function skillChapterKey(skill){
 const chapter=skillBookChapter(skill);
 return chapter==='companion'?`${chapter}:${skill.branch}`:chapter;
}
const roots={wisp:'main-efficiency',luminance:'main-sight',proximity:'proximity-awakening',dream:'main-dream',packing:'main-afterglow'};
export function normalizeChapterPrerequisites(definitions){
 for(const skill of Object.values(definitions)){
  if(skill.retired)continue;
  const original=[skill.requires].flat().filter(Boolean);
  if(!original.length)continue;
  const key=skillChapterKey(skill);
  const local=original.filter(id=>definitions[id]&&!definitions[id].retired&&skillChapterKey(definitions[id])===key);
  if(local.length===original.length)continue;
  const root=skillBookChapter(skill)==='companion'?`${skill.branch}-attunement`:roots[key];
  // Retain every valid local gate. A cross-chapter-only dependency becomes
  // this chapter's own entry gate; the entry skill itself remains independent.
  const replacement=local.length?local:root&&root!==skill.id&&definitions[root]&&!definitions[root].retired?[root]:[];
  skill.requires=Array.isArray(skill.requires)?replacement:replacement[0]||null;
 }
 return definitions;
}
