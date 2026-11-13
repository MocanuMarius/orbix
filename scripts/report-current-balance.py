"""Summarize the named before/after reports. Requires matplotlib for the chart."""
import json
from pathlib import Path
import zipfile
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

load = lambda name: json.loads(Path(f'work/clear-sparks-{name}.json').read_text(encoding='utf-8'))
before, after = load('economy-control'), load('economy-tuned')
choices, combos, routes, flight = [load(n) for n in ['choices-tuned', 'combos-final', 'routes-final', 'flight-tuned']]
compact = lambda data, keys: {k: v for k, v in data.items() if k in keys}
economy_keys = ['sourceHashes', 'sourceUnchanged', 'coverage', 'groups', 'assumptions']
summary = dict(release='balanced-sparks-1', date='2026-11-13', beforeCommit='13ea7f5e168ab1110c64fba4e5eb547dec14df81',
    method='Declared resource schedules and mechanical stress, not measured human win rates',
    before=compact(before, economy_keys), after=compact(after, economy_keys),
    choices={k:v for k,v in choices.items() if k not in ['marginals','rests']}, combos=combos,
    routes=routes['summary'], flight={k:v for k,v in flight.items() if k != 'records'})
Path('docs/balance-2026-11-13-summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')

plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False})
fig,(ax,bx)=plt.subplots(1,2,figsize=(11,4.5),gridspec_kw={'width_ratios':[1,1.1]})
fig.patch.set_facecolor('#f5f4ef')
for a in [ax,bx]:
    a.set_facecolor('#f5f4ef');a.grid(axis='y',alpha=.2);a.set_axisbelow(True)
styles=['learning','steady','practiced'];x=list(range(3));width=.34
old=[before['groups'][f'style:{s}:clear']['medianBuys'] for s in styles]
new=[after['groups'][f'style:{s}:clear']['medianBuys'] for s in styles]
ax.bar([i-width/2 for i in x],old,width,label='Before',color='#8c9095')
ax.bar([i+width/2 for i in x],new,width,label='Tuned',color='#488677')
ax.axhline(7.5,color='#a3753c',ls='--',lw=1,label='1 upgrade / 2 flights')
ax.set_xticks(x,[s.title() for s in styles]);ax.set_ylabel('Paid upgrades over 15 flights');ax.set_ylim(0,11)
ax.set_title('Purchase pace by assumed play style',loc='left',fontsize=12,fontweight='bold')
ax.legend(loc='upper left',frameon=False,fontsize=9)
for group,off in [(old,-width/2),(new,width/2)]:
    for i,v in enumerate(group):ax.text(i+off,v+.12,str(v),ha='center',fontsize=11)
for data,label,color in [(before,'Before','#8c9095'),(after,'Tuned','#488677')]:
    vals=data['groups']['style:steady:clear']['mapMedianBuys']
    bx.plot([1,2,3],vals,marker='o',linewidth=2,color=color,label=label)
    for i,v in enumerate(vals):bx.annotate(str(v),(i+1,v),xytext=(5,7 if label=='Tuned' else -17),textcoords='offset points',color=color)
bx.plot([1,2,3],[2.5,5,7.5],ls='--',color='#a3753c',linewidth=1,label='Target pace')
bx.set_xticks([1,2,3],['Map 1','Map 2','Map 3']);bx.set_ylim(0,10);bx.set_ylabel('Cumulative paid upgrades')
bx.set_title('Steady scenario: choices across the run',loc='left',fontsize=12,fontweight='bold');bx.legend(frameon=False,fontsize=9,loc='upper left')
fig.suptitle('Wispbound | balance simulations',x=.06,ha='left',fontweight='bold',fontsize=17)
fig.text(.06,.035,'Conditional on 15 clears; 576 scenarios per style/version. Lower medians. These are modeled schedules, not human telemetry.',fontsize=9,color='#55585c')
fig.subplots_adjust(left=.07,right=.98,top=.79,bottom=.18,wspace=.33)
Path('docs/assets').mkdir(exist_ok=True)
fig.savefig('docs/assets/balance-2026-11-13.png',dpi=160);plt.close(fig)

out=Path('../../outputs').resolve();out.mkdir(exist_ok=True)
raw=['economy-control','economy-tuned','choices-baseline','choices-tuned','combos-final','routes-final','flight-baseline','flight-tuned','roots-baseline','roots-tuned','glass3','glass4','growth030','growth025']
archive=out/'wispbound-balance-2026-11-13.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name in raw:z.write(f'work/clear-sparks-{name}.json',f'raw/{name}.json')
    for name in ['docs/balance-2026-11-13.md','docs/balance-2026-11-13-summary.json','docs/assets/balance-2026-11-13.png']:z.write(name,name)
print(archive)
print(f'{archive.stat().st_size:,} bytes')
