"""Original Wispbound score, Lantern Drift. No samples or third-party recordings.
Offline only: NumPy synthesis -> WAV -> MP3 via imageio-ffmpeg (or system ffmpeg).
Run from repository root. The game streams the resulting file; it never synthesizes it.
"""
from pathlib import Path
import sys, wave, subprocess, shutil
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SR=22050; BEAT=60/72; BAR=BEAT*4; LENGTH=64*BAR*2+9
rng=np.random.default_rng(18261)
mix=np.zeros((int(LENGTH*SR),2),np.float32)

def note(at, midi, duration, volume=.1, voice='keys', pan=0):
    n=int(duration*SR); t=np.arange(n,dtype=np.float32)/SR
    f=440*2**((midi-69)/12); phase=2*np.pi*f*t
    if voice=='pad':
        y=(np.sin(phase)+.45*np.sin(phase*1.0018)+.22*np.sin(phase*2))/1.67
        env=np.minimum(t/1.3,1)*np.minimum((duration-t)/1.8,1)
    elif voice=='bell':
        y=np.sin(phase+1.4*np.sin(phase*2)*np.exp(-t*3))+.16*np.sin(phase*3)
        env=np.minimum(t/.015,1)*np.exp(-t/1.1)*np.minimum((duration-t)/.4,1)
    elif voice=='bass':
        y=np.sin(phase)+.12*np.sin(phase*2)
        env=np.minimum(t/.12,1)*np.exp(-t/2)*np.minimum((duration-t)/.4,1)
    else:
        y=np.sin(phase+.7*np.sin(phase*2)*np.exp(-t*2))+.14*np.sin(phase*3)*np.exp(-t*4)
        env=np.minimum(t/.025,1)*np.exp(-t/1.7)*np.minimum((duration-t)/.5,1)
    y=(y*env*volume).astype(np.float32); start=max(0,int(at*SR)); size=min(n,len(mix)-start)
    if size<=0:return
    mix[start:start+size,0]+=y[:size]*np.sqrt((1-pan)/2)
    mix[start:start+size,1]+=y[:size]*np.sqrt((1+pan)/2)

progressions=[
 [[50,57,60,64],[46,53,57,60],[53,60,64,67],[48,55,62,64],[43,50,57,58],[46,53,60,62],[45,52,55,60],[50,57,62,64]],
 [[50,57,60,65],[48,55,59,62],[46,53,57,64],[53,60,64,69],[43,50,57,62],[45,52,55,60],[46,53,60,65],[50,57,60,64]],
 [[53,60,64,69],[48,55,62,67],[50,57,60,65],[46,53,57,62],[43,50,58,65],[50,57,62,64],[45,52,60,64],[50,57,60,65]],
 [[46,53,57,60],[48,55,62,64],[50,57,60,64],[53,60,64,67],[43,50,57,58],[46,53,60,65],[48,55,62,64],[50,57,60,62]]]
motifs=[[0,2,1,3,2],[3,1,2,0],[1,0,3],[0,1,3,2,1,0]]
for i in range(64):
    chord=progressions[(i//8)%4][i%8]; at=i*BAR*2; section=i//16
    # Long breaths overlap; changing voicings and motifs avoid a short repeating loop.
    for j,midi in enumerate(chord):
        note(at+j*.06,midi+12,BAR*2+2,.037,'pad',(j-1.5)*.36)
        note(at+j*.09,midi+12,4.7,.055*rng.uniform(.85,1.05),'keys',(j-1.5)*.28)
    note(at,chord[0]-12,4.9,.095,'bass')
    if i%4!=3:note(at+BAR+BEAT*.05,chord[0]-12,2.7,.055,'bass')
    if i>1 and i%5!=4:
        motif=motifs[(i//2+section)%4]
        for j,index in enumerate(motif):
            start=at+BEAT*(1.5+j*1.25)+rng.uniform(-.035,.035)
            note(start,chord[index]+24,2.9,.025+rng.uniform(0,.018),'bell',rng.uniform(-.6,.6))
    if i%3==1:
        for j in (0,2):note(at+BAR+BEAT*.5+j*.08,chord[j]+12,3.5,.035,'keys',-.2+j*.2)
    # Subtle brushed pulse: intentionally absent during several breathing passages.
    if i>3 and i%8 not in (6,7):
        for beat in range(8):
            start=int((at+beat*BEAT+(0.025 if beat%2 else 0))*SR); n=int(.13*SR)
            t=np.arange(n,dtype=np.float32)/SR
            if beat%4==0:y=np.sin(2*np.pi*(48*t+2*(1-np.exp(-t*30))))*np.exp(-t*35)*.055
            else:
                noise=rng.normal(0,1,n).astype(np.float32)
                y=np.convolve(noise,np.ones(9,dtype=np.float32)/9,'same')*np.exp(-t*40)*(.018 if beat%2 else .009)
            mix[start:start+n]+=y[:,None]

# Quiet diffuse echoes, rendered once offline, with a tiny stereo offset.
dry=mix.copy()
for delay,gain in ((.31,.13),(.63,.09),(1.13,.055),(1.79,.035)):
    shift=int(delay*SR);mix[shift:,0]+=dry[:-shift,1]*gain
    shift+=89;mix[shift:,1]+=dry[:-shift,0]*gain
mix=np.tanh(mix*1.25)
fade=int(6*SR);mix[:fade]*=np.linspace(0,1,fade,dtype=np.float32)[:,None]
fade=int(9*SR);mix[-fade:]*=np.linspace(1,0,fade,dtype=np.float32)[:,None]
peak=float(np.max(np.abs(mix)));mix*=.72/max(.72,peak)
out=ROOT/'dist/assets/audio';out.mkdir(parents=True,exist_ok=True)
scratch=ROOT/'work/lantern-drift.wav';scratch.parent.mkdir(exist_ok=True)
with wave.open(str(scratch),'wb') as wav:
    wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR);wav.writeframes((mix*32767).astype('<i2').tobytes())
encoder=shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0,str(ROOT/'work/audio-tools'))
    import imageio_ffmpeg
    encoder=imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([encoder,'-y','-hide_banner','-loglevel','error','-i',str(scratch),'-codec:a','libmp3lame','-b:a','96k','-metadata','title=Lantern Drift','-metadata','artist=Wispbound original procedural score',str(out/'lantern-drift.mp3')],check=True)
(out/'README.txt').write_text('Lantern Drift — original Wispbound score.\nComposed and synthesized by scripts/compose-music.py.\nNo third-party samples, recordings, or licensed musical material.\n72 BPM, 64 evolving eight-beat phrases; seven minutes of pads, electric keys, soft bells and brushed rhythm.\nThe game streams one pre-rendered MP3 to keep synthesis off the gameplay thread.\n',encoding='utf-8')
print(f'Lantern Drift: {LENGTH:.1f}s; {peak:.3f} pre-normalization peak; {out/"lantern-drift.mp3"}')
