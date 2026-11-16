"""Encode actual App pixels at normal speed; no animation is synthesized."""
from pathlib import Path
import json, shutil, subprocess, sys
from PIL import Image

root=Path(__file__).resolve().parents[1]
work=root/'work/tow-swing-release'
capture=work/'capture'
proof=work/'proof'
proof.mkdir(parents=True,exist_ok=True)
media=root/'dist/assets/previews/collector-tether'
art=root/'dist/assets/previews/collector-art'
report=json.loads((capture/'report.json').read_text())
encoder=shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0,str(root/'work/audio-tools'))
    import imageio_ffmpeg
    encoder=imageio_ffmpeg.get_ffmpeg_exe()
fps=report['fps']
codec=['-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart']
source=str(capture/'frames/%04d.png')
def encode(destination,filters=None):
    command=[encoder,'-hide_banner','-loglevel','error','-y','-framerate',str(fps),'-i',source]
    if filters: command+=['-vf',filters]
    subprocess.run(command+codec+[str(destination)],check=True)

# This fixed camera crop leaves the full vertical Lift and cargo arc visible.
# It never follows or repositions an actor inside the captured frame.
box=(0,160,800,640)
encode(media/'reel.mp4','crop=800:480:0:160')
encode(proof/'flight.mp4','scale=900:405,pad=900:406')
shutil.copyfile(media/'reel.mp4',art/'tow.mp4')
towing=[(index,state) for index,state in enumerate(report['states']) if state['carrying']]
front=next(index for index,state in towing if state['collector']['depth']>.75 and state['time']>2)
back=next(index for index,state in towing if state['collector']['depth']<-.75 and state['time']>3)
near=next(index for index,state in reversed(towing) if state['gap']>40)
for name,index in [('front',front),('back',back),('near',near)]:
    image=Image.open(capture/'frames'/f'{index:04d}.png').convert('RGB').crop(box)
    image.save(media/f'reel-{name}.png')
    if name=='front':
        image.save(art/'tow-latch.png')
        image.save(proof/'poster.png')
    if name=='back': image.save(art/'tow-pull.png')
notes={key:report[key] for key in ['note','viewport','dpr','fps','seconds','events','inputs','errors']}
notes.update({'sourceReport':'work/tow-swing-release/capture/report.json','cropPixels':list(box),
              'capture':'Fixed screenshot crop, original pixels, 1x time, muted. Full HUD recording at previews/tow-swing-1/flight.mp4.',
              'stills':{'front':front,'back':back,'near':near},
              'historicalFiles':['before.mp4','after.mp4','wake-first-paint.png','wake-first-paint-without.png']})
(media/'capture-notes.json').write_text(json.dumps(notes,indent=2)+'\n')
(proof/'capture-notes.json').write_text(json.dumps(notes,indent=2)+'\n')
print(json.dumps({'reelBytes':(media/'reel.mp4').stat().st_size,'fullFlightBytes':(proof/'flight.mp4').stat().st_size,
                  'liftsWhileTowing':len([x for x in report['inputs'] if x['whileTowing']]),'stills':notes['stills']},indent=2))
