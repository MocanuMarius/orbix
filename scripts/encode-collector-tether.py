"""Encode the actual-app normal captures; keep a native actor crop for Guide."""
from pathlib import Path
import json, shutil, subprocess, sys
from PIL import Image, ImageChops

root=Path(__file__).resolve().parents[1]
work=root/'work/collector-tether'
out=root/'dist/assets/previews/collector-tether'
out.mkdir(parents=True,exist_ok=True)
encoder=shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0,str(root/'work/audio-tools'))
    import imageio_ffmpeg
    encoder=imageio_ffmpeg.get_ffmpeg_exe()
codec=['-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart']
def encode(frames,destination):
    subprocess.run([encoder,'-hide_banner','-loglevel','error','-y','-framerate','30','-i',str(frames/'%04d.png'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2']+codec+[str(destination)],check=True)
for build in ['before','after']:
    encode(work/(build+'-frames'),out/(build+'.mp4'))

report=json.loads((work/'report.json').read_text())
clip=next(c for c in report['clips'] if c['build']=='after')
scale=900/clip['initial']['width']*3
crops=work/'after-detail-frames'
crops.mkdir(exist_ok=True)
for i,state in enumerate(clip['states']):
    image=Image.open(work/'after-frames'/f'{i:04}.png')
    cy=round(state['y']*scale)
    crop=image.crop((0,cy-230,900,cy+230))
    crop.save(crops/f'{i:04}.png')
    if i in [22,33,110]:
        crop.save(out/({22:'reel-front.png',33:'reel-back.png',110:'reel-near.png'}[i]))
encode(crops,out/'reel.mp4')

a=Image.open(work/'wake-first-paint.png').convert('RGB')
b=Image.open(work/'wake-first-paint-without.png').convert('RGB')
x=clip['initial']['playerX']*scale;y=clip['initial']['playerY']*scale
box=(round(x)-150,round(y)-125,round(x)+130,round(y)+135)
a=a.crop(box);b=b.crop(box);diff=ImageChops.difference(a,b)
a.save(out/'wake-first-paint.png');b.save(out/'wake-first-paint-without.png')
proof={'worldTime':0,'simulationStepsAfterLift':0,'markCount':5,
       'changedActorPixelsOver2':sum(1 for p in diff.getdata() if max(p)>2),
       'actorDifferenceBounds':diff.getbbox(),
       'note':'Identical actual first render; the comparison disables only wake drawing. Native screenshot pixels.'}
(work/'wake-first-paint-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
notes={k:v for k,v in report.items() if k not in ['clips','performance']}
notes['deliveryEvents']=clip['events'];notes['firstPaintProof']=proof
notes['normalPerformanceReport']='work/collector-tether/report-normal.json'
(out/'capture-notes.json').write_text(json.dumps(notes,indent=2)+'\n')
print(json.dumps({'output':str(out),'firstPaint':proof},indent=2))
