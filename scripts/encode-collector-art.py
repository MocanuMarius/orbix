"""Encode the matched, full-app captures without changing their source pixels."""
from pathlib import Path
import json, shutil, subprocess, sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
work = ROOT/'work/collector-art-capture'
out = ROOT/'dist/assets/previews/collector-art'
out.mkdir(parents=True, exist_ok=True)
report = json.loads((work/'report.json').read_text())
encoder = shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0, str(ROOT/'work/audio-tools'))
    import imageio_ffmpeg
    encoder = imageio_ffmpeg.get_ffmpeg_exe()
fps = report['fps']
stills = {'front': 5, 'back': 20, 'fetch': 40}
for variant in ['current', 'flat2', 'flat3']:
    frames = work/variant
    assert all((frames/f'{i:04}.png').is_file() for i in range(fps*report['seconds']))
    args = [encoder, '-hide_banner', '-loglevel', 'error', '-y', '-framerate', str(fps), '-i', str(frames/'%04d.png')]
    codec = ['-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    subprocess.run(args+['-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2']+codec+[str(out/f'{variant}.mp4')], check=True)
    crops = work/(variant+'-crops')
    crops.mkdir(parents=True, exist_ok=True)
    states = next(r['states'] for r in report['results'] if r['art'] == variant)
    for index, state in enumerate(states):
        image = Image.open(frames/f'{index:04}.png')
        # Follow the player only in this explicitly identified magnified inset.
        # Keep original screenshot pixels, including the production orbit.
        center_x = state['playerX']/report['results'][0]['initial']['width']*900
        center_y = state['playerY']/report['results'][0]['initial']['height']*405
        left, top = round(center_x)-64, round(center_y)-64
        crop = image.crop((left, top, left+128, top+128))
        crop.save(crops/f'{index:04}.png')
        for key, frame in stills.items():
            if index == frame:
                image.save(out/f'{variant}-{key}.png')
                crop.save(out/f'{variant}-{key}-native.png')
    subprocess.run([encoder, '-hide_banner', '-loglevel', 'error', '-y', '-framerate', str(fps), '-i', str(crops/'%04d.png')]+codec+[str(out/f'{variant}-detail.mp4')], check=True)

summary = {k:v for k,v in report.items() if k != 'results'}
summary['stills'] = {key: {'frame': frame, 'simulationTime': (frame+1)/fps, 'videoTime': frame/fps} for key,frame in stills.items()}
summary['matched'] = [{k:v for k,v in r.items() if k != 'states'} for r in report['results']]
(out/'capture-notes.json').write_text(json.dumps(summary, indent=2)+'\n')
print('Encoded 3 full-app movies, 3 synchronized detail movies and 18 native PNG stills.')
