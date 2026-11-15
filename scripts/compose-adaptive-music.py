"""Original synchronized Wispbound stems. Offline synthesis, no external samples.
160 evolving bars at 88 BPM; three equal-length MP3s for adaptive playback.
"""
from pathlib import Path
import shutil, subprocess, sys, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SR=22050; BEAT=60/88; BAR=4*BEAT; BARS=160; LENGTH=BARS*BAR
CHORDS=[
 [[50,57,60,64],[46,53,57,60],[53,60,64,67],[48,55,62,64],[43,50,57,58],[46,53,60,62],[45,52,55,60],[50,57,62,64]],
 [[50,57,60,65],[48,55,59,62],[46,53,57,64],[53,60,64,69],[43,50,57,62],[45,52,55,60],[46,53,60,65],[50,57,60,64]],
 [[53,60,64,69],[48,55,62,67],[50,57,60,65],[46,53,57,62],[43,50,58,65],[50,57,62,64],[45,52,60,64],[50,57,60,65]],
 [[46,53,57,60],[48,55,62,64],[50,57,60,64],[53,60,64,67],[43,50,57,58],[46,53,60,65],[48,55,62,64],[50,57,60,62]],
 [[50,57,62,65],[53,60,64,69],[46,53,60,65],[48,55,59,64],[43,50,57,62],[46,53,57,64],[45,52,60,64],[50,57,60,65]],
]
encoder=shutil.which('ffmpeg')
if not encoder:
 sys.path.insert(0,str(ROOT/'work/audio-tools'))
 import imageio_ffmpeg
 encoder=imageio_ffmpeg.get_ffmpeg_exe()
out=ROOT/'dist/assets/audio';out.mkdir(parents=True,exist_ok=True)
for stem,filename in enumerate(['lantern-drift','lantern-pulse','lantern-storm']):
 rng=np.random.default_rng(41871+stem)
 mix=np.zeros((int(LENGTH*SR),2),np.float32)
 def add(at,y,pan=0):
  start=max(0,int(at*SR));n=min(len(y),len(mix)-start)
  if n<=0:return
  mix[start:start+n,0]+=y[:n]*np.sqrt((1-pan)/2)
  mix[start:start+n,1]+=y[:n]*np.sqrt((1+pan)/2)
 def note(at,midi,duration,volume,voice='pluck',pan=0):
  t=np.arange(int(duration*SR),dtype=np.float32)/SR
  f=440*2**((midi-69)/12);phase=2*np.pi*f*t
  if voice=='pad':
   y=(np.sin(phase)+.4*np.sin(phase*1.002)+.18*np.sin(phase*2))/1.58
   env=np.minimum(t/.9,1)*np.minimum((duration-t)/1.1,1)
  elif voice=='bass':
   y=np.sin(phase)+.15*np.sin(phase*2)+.06*np.sin(phase*3)
   env=np.minimum(t/.012,1)*np.exp(-t/1.1)*np.minimum((duration-t)/.09,1)
  else:
   y=np.sin(phase+(.8 if voice=='pluck' else 1.5)*np.sin(phase*2)*np.exp(-t*3))
   y+=.13*np.sin(phase*3)*np.exp(-t*6)
   env=np.minimum(t/.012,1)*np.exp(-t/(.8 if voice=='pluck' else 1.7))*np.minimum((duration-t)/.13,1)
  add(at,(y*env*volume).astype(np.float32),pan)
 def drum(at,kind,volume,pan=0):
  t=np.arange(int(.36*SR),dtype=np.float32)/SR
  if kind=='kick':y=np.sin(2*np.pi*(47*t+2.8*(1-np.exp(-t*34))))*np.exp(-t*19)
  elif kind=='snare':
   noise=rng.normal(0,1,len(t)).astype(np.float32)
   y=(noise*.5+np.sin(2*np.pi*173*t)*.3)*np.exp(-t*27)
  else:
   noise=rng.normal(0,1,len(t)).astype(np.float32)
   y=(noise-np.convolve(noise,np.ones(11,dtype=np.float32)/11,'same'))*np.exp(-t*65)
  add(at,y*volume,pan)
 for bar in range(BARS):
  chapter=bar//16;chord=CHORDS[(chapter//2)%len(CHORDS)][(bar//2+chapter%2)%8];at=bar*BAR
  if stem==0:
   if bar%2==0:
    for j,m in enumerate(chord):note(at+j*.035,m+12,BAR*2+1.5,.050,'pad',(j-1.5)*.35)
   if bar%4!=3:
    for j in [0,2,3]:note(at+BEAT*(j*.43),chord[j]+12,2.7,.075,'pluck',(j-1.5)*.3)
   if bar%8 not in (6,7):
    motif=[[0,2,1,3],[3,1,2],[1,0,3,2,1],[0,1,3]][chapter%4]
    for j,k in enumerate(motif):
     if rng.random()<.17:continue
     note(at+BEAT*(.5+j*.7)+rng.uniform(-.028,.028),chord[k]+24+(12 if chapter%5==3 and j==2 else 0),2.8,.035+rng.random()*.020,'bell',rng.uniform(-.65,.65))
  elif stem==1:
   # A syncopated pulse with changing bass, voicing, drum fills and breath bars.
   breath=bar%16 in (14,15);density=[.56,.75,.64,.86,.70][chapter%5]
   for beat in [0,1.5,2,3.25] if chapter%3 else [0,1,2.5]:
    if breath and beat!=0:continue
    note(at+beat*BEAT,chord[0]-12+(12 if beat==3.25 else 0),.7,.18,'bass')
    drum(at+beat*BEAT,'kick',.25 if beat==0 else .19)
   if not breath:
    for beat in [1,3]:drum(at+beat*BEAT+.011,'snare',.075)
    for step in range(8):
     if rng.random()<.16:continue
     drum(at+step*BEAT/2+(.018 if step%2 else 0),'hat',.024 if step%2 else .016,(step%3-1)*.4)
    order=[[0,2,1,3,2,0,3,1],[3,2,0,1,2,3,1,0],[0,1,2,1,3,2,0,2]][chapter%3]
    for step,k in enumerate(order):
     if rng.random()<density:note(at+step*BEAT/2,chord[k]+12,.6,.065,'pluck',(-.35 if step%2 else .35))
   if bar%8==7:
    for step in range(3):drum(at+(3.1+step*.23)*BEAT,'snare',.030+step*.012,step*.18-.18)
  else:
   # Guardian pressure: low toms, answering ostinatos and occasional risers.
   for beat in [0,.75,2,2.75]:
    note(at+beat*BEAT,chord[(bar+int(beat*2))%3],.75,.105,'bass',-.18 if beat<2 else .18)
   for beat in [0,2,3.5] if bar%4==3 else [.5,2.5]:drum(at+beat*BEAT,'kick',.17)
   for j,k in enumerate([0,2,3,1]):
    if (bar+j)%5:note(at+(j+.25)*BEAT,chord[k]+24,.8,.050,'pluck',(j-1.5)*.35)
   if bar%8==7:
    t=np.arange(int(BEAT*1.5*SR),dtype=np.float32)/SR
    noise=rng.normal(0,1,len(t)).astype(np.float32)
    y=np.convolve(noise,np.ones(13,dtype=np.float32)/13,'same')*(t/(BEAT*1.5))**2*.06
    add(at+BEAT*2.5,y)
 dry=mix.copy()
 for delay,gain in [(BEAT*.75,.16),(BEAT*1.5,.09),(BEAT*2.75,.05)]:
  shift=int(delay*SR);mix[shift:,0]+=dry[:-shift,1]*gain;mix[shift:,1]+=dry[:-shift,0]*gain
 mix=np.tanh(mix*1.15)
 fade=int(1.7*SR);mix[:fade]*=np.linspace(0,1,fade,dtype=np.float32)[:,None];mix[-fade:]*=np.linspace(1,0,fade,dtype=np.float32)[:,None]
 peak=float(np.max(np.abs(mix)));mix*=.8/max(.4,peak)
 scratch=ROOT/'work/adaptive-score.wav'
 with wave.open(str(scratch),'wb') as wav:
  wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR);wav.writeframes((mix*32767).astype('<i2').tobytes())
 subprocess.run([encoder,'-y','-hide_banner','-loglevel','error','-i',str(scratch),'-codec:a','libmp3lame','-b:a','96k','-metadata','title=Wispbound — '+filename,str(out/(filename+'.mp3'))],check=True)
 print(filename,round(LENGTH,2),'seconds; peak',round(peak,3),flush=True)
(out/'README.txt').write_text('Original Wispbound adaptive score. No third-party samples or recordings.\nComposed by scripts/compose-adaptive-music.py.\n88 BPM, 160 evolving bars (7m16s), synchronized ambient, rhythmic and guardian stems.\nAll stems stream as MP3s; gameplay changes their mix without live synthesis.\n',encoding='utf-8')
