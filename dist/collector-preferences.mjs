export const COLLECTOR_PREFERENCES=Object.freeze([
 {id:'nearest',label:'Nearest',skill:null},
 {id:'dense',label:'Dense first',skill:'collector-target-dense'},
 {id:'flash',label:'Flash first',skill:'collector-target-flash'},
]);
export function learnedCollectorPreferences(run){return COLLECTOR_PREFERENCES.filter(p=>!p.skill||run.skills?.[p.skill]>0);}
export function collectorPreference(run){return learnedCollectorPreferences(run).find(p=>p.id===run.collectorPreference)?.id||'nearest';}
export function collectorPreferenceMarkup(run){
 const options=learnedCollectorPreferences(run);if(options.length<2)return '';
 const active=collectorPreference(run),checkpoint=!run.attemptActive;
 return `<nav class="book-targeting" aria-label="Collector targeting">${options.map(p=>`<button type="button" data-action="collector-preference" data-id="${p.id}" aria-pressed="${active===p.id}" ${checkpoint?'':'disabled'}>${p.label}</button>`).join('')}${checkpoint?'':'<small>Change at a checkpoint</small>'}</nav>`;
}
