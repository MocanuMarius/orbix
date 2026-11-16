"""Normal-speed production captures, plus an explicitly aligned contact replay."""
from pathlib import Path
import json, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
work=root/'work/collector-tow-proof'
out=root/'dist/assets/previews/collector-tow'
out.mkdir(parents=True,exist_ok=True)
report=json.loads((work/'report.json').read_text())
direct=next(c for c in report['cases'] if c['name']=='native-direct')
tow=next(c for c in report['cases'] if c['name']=='native-single')
fps=report['fps'];width=35.08375

def metrics(case):
    event=case['events'][0]
    samples=[(s['time'],s['packets'][0]['gap']) for s in case['states'] if not s['packets'][0]['collected']]
    samples.append((event['time'],event['gap']))
    crossing=None
    for a,b in zip(samples,samples[1:]):
        if a[1]>=event['gap']+width>=b[1]:
            crossing=a[0]+(a[1]-event['gap']-width)/(a[1]-b[1])*(b[0]-a[0])
    assert crossing is not None
    duration=event['time']-crossing
    return {'impactWorldSeconds':event['time'],'lastBodyWidthWorldUnits':width,
        'lastBodyWidthSeconds':duration,'lastBodyWidthAverageWorldSpeed':width/duration,
        'contactWorldSpeed':event['speed'],'deliveryCount':len(case['events']),
        'attachments':case['attachments']}

measurements={'direct':metrics(direct),'collector':metrics(tow)}
frames=work/'comparison-frames';frames.mkdir(exist_ok=True)
font_path='C:/Windows/Fonts/segoeui.ttf'
font=ImageFont.truetype(font_path,34);small=ImageFont.truetype(font_path,26)
panel_width=1050;panel_height=540;header=88;footer=76

def panel(case,index):
    s=case['states'][index]
    im=Image.open(work/(case['name']+'-frames')/f'{index:04}.png').convert('RGB')
    scale=im.width/report['viewport'][0]*report['viewport'][0]/case['initial']['width']
    cy=round(s['y']*scale)
    return im.crop((0,cy-250,panel_width,cy-250+panel_height))

schedule=[(i,i,False) for i in range(180)]
# Source times are shifted, never stretched. Both native impacts occur at
# the same replay time; the first section already includes the full reel.
offset=round((tow['events'][0]['time']-direct['events'][0]['time'])*fps)
schedule += [(i,i+offset,True) for i in range(45)]
for frame,(di,ti,replay) in enumerate(schedule):
    im=Image.new('RGB',(panel_width*2,panel_height+header+footer),'#111d1b')
    im.paste(panel(direct,di),(0,header));im.paste(panel(tow,ti),(panel_width,header))
    d=ImageDraw.Draw(im);d.line((panel_width,0,panel_width,im.height),fill='#50695f',width=2)
    for x,title,case,index in [(22,'Direct body pickup',direct,di),(panel_width+22,'Collector recovery reel',tow,ti)]:
        d.text((x,8),title,font=font,fill='#e5f1d6')
        label='Contact replay: 1x, impacts aligned' if replay else 'Full opening through impact: 1x'
        d.text((x,52),label,font=small,fill='#a4c7af')
        s=case['states'][index];impact=case['events'][0]['time']
        status='Absorbed' if s['time']>=impact else ('Reeling' if s['packets'][0]['carried'] else 'Approaching')
        d.text((x,header+panel_height+6),f"{s['time']:.2f} s   {status}",font=small,fill='#e5f1d6')
    d.text((22,im.height-36),'Muted - 30 fps - actual production renderers - normal Lift input - staged passage Sparks',font=small,fill='#a4c7af')
    im.save(frames/f'{frame:04}.png')
    if frame in [0,100,135,197]:im.save(out/f'comparison-{frame:03}.png')

encoder=shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0,str(root/'work/audio-tools'))
    import imageio_ffmpeg
    encoder=imageio_ffmpeg.get_ffmpeg_exe()
destination=out/'acceleration-comparison.mp4'
subprocess.run([encoder,'-hide_banner','-loglevel','error','-y','-framerate',str(fps),'-i',str(frames/'%04d.png'),
    '-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(destination)],check=True)
notes={'note':report['note'],'capture':'Native screenshot crops follow player height; source pixels are unchanged. Labels are outside gameplay. Muted, 30 fps, normal world speed throughout.',
    'sections':[{'videoStartSeconds':0,'seconds':6,'kind':'full opening through impact, both cases at world time 0'},
        {'videoStartSeconds':6,'seconds':1.5,'kind':'contact replay, source time shifted to align impacts; no retiming','collectorSourceOffsetSeconds':offset/fps}],
    'measurements':measurements,'directNominalSpeed':154,'nominalBodyWidthSeconds':width/154,
    'sampling':'Measured from actual cargo/body gap, linear crossing interpolation between 30 fps captured simulation states; delivery is recorded at the exact 60 Hz production step.',
    'runtimeErrors':report['errors'],'productionCases':[{'name':c['name'],'deliveryEvents':c['events']} for c in report['cases']],
    'cadenceMetrics':json.loads((work/'rate-metrics.json').read_text()) if (work/'rate-metrics.json').exists() else [],
    'sourceReport':'work/collector-tow-proof/report.json'}
(out/'capture-notes.json').write_text(json.dumps(notes,indent=2)+'\n')
print(json.dumps({'video':str(destination),'durationSeconds':len(schedule)/fps,'metrics':measurements},indent=2))
