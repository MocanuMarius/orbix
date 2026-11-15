"""Encode the actual-renderer PNG export from record-boundary-video.mjs."""
from pathlib import Path
import subprocess, sys, shutil
ROOT = Path(__file__).resolve().parents[1]
encoder = shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0, str(ROOT/'work/audio-tools'))
    import imageio_ffmpeg
    encoder = imageio_ffmpeg.get_ffmpeg_exe()
frames = ROOT/'work/edge-ideas/frames'
assert all((frames/f'{i:04}.png').is_file() for i in range(360)), 'Export all 360 frames first'
output = ROOT/'dist/assets/previews'
output.mkdir(parents=True, exist_ok=True)
common = [encoder,'-hide_banner','-loglevel','error','-y']
sequence = ['-framerate','30','-i',str(frames/'%04d.png')]
codec = ['-frames:v','360','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','-an']
def run(args): subprocess.run(common+args, check=True)
run(sequence+codec+[str(output/'edge-ideas-comparison.mp4')])
wide = '[0:v]split=4[a][b][c][d];[a]crop=960:520:0:0[x];[b]crop=960:520:0:520[y];[c]crop=960:520:0:1040[z];[d]crop=960:520:0:1560[w];[x][y]hstack=inputs=2[top];[z][w]hstack=inputs=2[bottom];[top][bottom]vstack=inputs=2[v]'
run(sequence+['-filter_complex',wide,'-map','[v]']+codec+[str(output/'edge-ideas-grid.mp4')])
still = ['-i',str(frames/'0090.png')]
run(still+['-frames:v','1','-q:v','2',str(output/'edge-ideas-comparison.jpg')])
run(still+['-filter_complex',wide,'-map','[v]','-frames:v','1','-q:v','2',str(output/'edge-ideas-grid.jpg')])
for i, style in enumerate(['carved','spectral','roots','fracture']):
    crop = f'crop=960:520:0:{i*520}'
    run(sequence+['-vf',crop]+codec+[str(output/f'edge-ideas-{style}.mp4')])
    run(still+['-vf',crop,'-frames:v','1','-q:v','2',str(output/f'edge-ideas-{style}.jpg')])
print('Encoded six synchronized 12-second H.264 videos and matching posters.')
