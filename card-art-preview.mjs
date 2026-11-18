import {cardFace} from './card-ui.mjs?v=detail-1';
import {makeSkillCard,describeSkillCard} from './skill-cards.mjs?v=detail-1';
import {installCardTermHelp} from './card-terms.mjs?v=detail-1';
const variants = [{name:'Current',scale:1,note:'Original illustration'},{name:'Mild',scale:.75,note:'75% resolution · nearest neighbor'},{name:'Medium',scale:.58,note:'58% resolution · nearest neighbor'}];
const cards = ['body-spark','field-impulse','flash-handling','harvest-legendary'];
const load = image => image.decode();
let selected = cards[0], screen = 'deck', cardVersion = 0, screenVersion = 0;
function reducedCanvas(source, width, height, scale, crop = null) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(width * scale)); canvas.height = Math.max(1,Math.round(height * scale));
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if(crop)ctx.drawImage(source,...crop,0,0,canvas.width,canvas.height);
  else ctx.drawImage(source,0,0,canvas.width,canvas.height);
  canvas.style.imageRendering = scale === 1 ? 'auto' : 'pixelated';
  return canvas;
}
async function renderCards() {
  const version = ++cardVersion;
  const card = describeSkillCard(makeSkillCard(selected,'art-preview'));
  const atlas = new Image(); atlas.src = './assets/cards/skill-card-scenes-rare.webp';
  document.getElementById('art-card-comparison').innerHTML = variants.map(({name,note,scale})=>`<section class="art-card-variant" data-art-scale="${scale}"><h2 class="art-variant-title">${name}</h2><p class="art-variant-note">${note}</p>${cardFace(card)}</section>`).join('');
  document.querySelectorAll('[data-art-card]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.artCard === selected)));
  await load(atlas); await document.fonts.ready;
  if(version !== cardVersion)return;
  for(const node of document.querySelectorAll('.art-card-variant')) {
    const scale = Number(node.dataset.artScale); if(scale === 1)continue;
    const source = node.querySelector('.card-illustration>.skill-card-art'), box = source.getBoundingClientRect(), view = source.viewBox.baseVal;
    // SVG xMidYMid slice: preserve its exact centered atlas crop.
    const targetRatio = box.width / box.height, cropWidth = targetRatio >= 1 ? view.width : view.width * targetRatio, cropHeight = targetRatio >= 1 ? view.height / targetRatio : view.height;
    const sourceScale = atlas.naturalWidth / 1252;
    const crop = [view.x+(view.width-cropWidth)/2,view.y+(view.height-cropHeight)/2,cropWidth,cropHeight].map(value=>value*sourceScale);
    const canvas = reducedCanvas(atlas,box.width,box.height,scale,crop);
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${source.getAttribute('aria-label')} ${node.querySelector('h2').textContent} pixelation preview.`);
    canvas.dataset.source = atlas.getAttribute('src'); source.replaceWith(canvas);
  }
}
async function renderScreens() {
  const version = ++screenVersion, host = document.getElementById('art-screen-comparison');
  document.querySelectorAll('[data-screen]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.screen === screen)));
  host.innerHTML = '<p class="art-screen-status">Loading the captured game frame…</p>';
  const capture = new Image(); capture.src = `./assets/previews/pixelation-${screen}.webp`;
  try {await load(capture);} catch {host.innerHTML='<p class="art-screen-status">The game capture is being prepared. The live card comparison above is ready.</p>';return;}
  if(version !== screenVersion)return;
  host.replaceChildren();
  for(const variant of variants) {
    const figure = document.createElement('figure');figure.className='art-screen-variant';
    const heading=document.createElement('h3');heading.className='art-variant-title';heading.textContent=`${variant.name} · ${variant.note}`;figure.append(heading);
    const width=Math.min(740,host.clientWidth),canvas=reducedCanvas(capture,width,width*333/740,variant.scale);
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${variant.name} ${screen} screen, captured from the running game.`);canvas.dataset.source=capture.src;figure.append(canvas);host.append(figure);
  }
}
document.getElementById('art-card-controls').innerHTML=cards.map(id=>`<button type="button" data-art-card="${id}" aria-pressed="${id===selected}">${describeSkillCard(makeSkillCard(id,'preview-control')).name}</button>`).join('');
document.getElementById('art-card-controls').addEventListener('click',event=>{const button=event.target.closest('[data-art-card]');if(button){selected=button.dataset.artCard;renderCards();}});
document.getElementById('art-screen-controls').addEventListener('click',event=>{const button=event.target.closest('[data-screen]');if(button){screen=button.dataset.screen;renderScreens();}});
let resize;addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{renderCards();renderScreens();},80);});
installCardTermHelp();renderCards();renderScreens();
