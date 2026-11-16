// Display compatibility for notes already formatted into older saves.
// Only known challenge prefixes are removed; unrelated reward names stay intact.
const legacyNames=Object.freeze(['Gilded Passage','Three Suns','Pilgrim Precision','Wild Circuit','Flash Relay','Long Glide','Edgeweaver','Night Sail','Wayfinder','Spark Trail','Rising Constellation','Heartwood Trail']);
export function routeBonusNoteText(value){
 const text=String(value??'').trim();
 for(const name of legacyNames){
  if(text===name||text===`${name} challenge completed.`||text===`${name} completed.`)return '';
  for(const prefix of [`${name} · `,`${name} completed. `,`${name} challenge completed. `])
   if(text.startsWith(prefix))return text.slice(prefix.length).trim();
 }
 return text;
}
export function routeBonusReceiptText(receipt){
 const detail=routeBonusNoteText(receipt?.message);
 if(detail)return detail;
 const amount=Math.max(0,Math.floor(Number(receipt?.amount)||0));
 return amount?`+${amount} Stored Sparks`:'';
}
