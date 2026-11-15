"""Encode the real WispFlightView before/after frame exports."""
from pathlib import Path
import subprocess, sys, shutil, json, struct
ROOT=Path(__file__).resolve().parents[1]
encoder=shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0,str(ROOT/'work/audio-tools'))
    import imageio_ffmpeg
    encoder=imageio_ffmpeg.get_ffmpeg_exe()
out=ROOT/'dist/assets/previews'
out.mkdir(parents=True,exist_ok=True)
common=[encoder,'-hide_banner','-loglevel','error','-y']
results=[]
for biome in ['pinewood','basalt']:
    frames=ROOT/'work/first-light-films/frames'/biome
    for index in range(360):
        path=frames/f'{index:04}.png'
        assert path.is_file(),f'Missing {path}'
        with path.open('rb') as image:
            image.seek(16)
            assert struct.unpack('>II',image.read(8))==(720,960),f'Unexpected dimensions: {path}'
    video=out/f'first-light-{biome}.mp4'
    subprocess.run(common+['-framerate','30','-i',str(frames/'%04d.png'),'-frames:v','360','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(video)],check=True)
    subprocess.run(common+['-i',str(frames/'0090.png'),'-frames:v','1','-q:v','2',str(out/f'first-light-{biome}.jpg')],check=True)
    # Decode every frame; also require the index (moov) before media for mobile seeking.
    subprocess.run(common+['-i',str(video),'-f','null','-'],check=True)
    boxes=[]
    with video.open('rb') as file:
        while header:=file.read(8):
            size,kind=struct.unpack('>I4s',header)
            if size==1:
                size=struct.unpack('>Q',file.read(8))[0];file.seek(size-16,1)
            else:file.seek(size-8,1)
            boxes.append(kind.decode())
    assert boxes.index('moov')<boxes.index('mdat'),'faststart index is missing'
    results.append({'biome':biome,'video':str(video.relative_to(ROOT)),'bytes':video.stat().st_size,'dimensions':[720,960],'duration':12,'fps':30,'codec':'H.264','pixelFormat':'yuv420p','audio':False,'faststart':True,'decodeCheck':'all 360 frames passed'})
(ROOT/'work/first-light-films/encoding-evidence.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
