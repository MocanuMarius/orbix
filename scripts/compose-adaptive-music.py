"""Original Wispbound warm lo-fi score; no third-party samples or melodies.

Offline composition: 160 arranged bars at 78 BPM, three synchronized stems.
Use --bars 32 --output work/lofi-sketch for a shorter production sketch.
"""
from pathlib import Path
import argparse, json, shutil, subprocess, sys, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--bars', type=int, default=160)
parser.add_argument('--output', type=Path, default=ROOT/'dist/assets/audio')
args = parser.parse_args()
SR = 32000
BPM = 78
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = max(16, args.bars)
LENGTH = BARS * BAR
OUT = args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
SCRATCH = ROOT/'work/lofi-score'
SCRATCH.mkdir(parents=True, exist_ok=True)
encoder = shutil.which('ffmpeg')
if not encoder:
    sys.path.insert(0, str(ROOT/'work/audio-tools'))
    import imageio_ffmpeg
    encoder = imageio_ffmpeg.get_ffmpeg_exe()

# Rootless jazz voicings leave room for bass: sevenths, ninths and soft
# suspensions. Ten written sections change the harmony, register and phrasing.
CHORDS = {
    'Dm9': (38, [53, 57, 60, 64]), 'Bbmaj9': (34, [57, 60, 62, 65]),
    'Fmaj9': (41, [57, 60, 64, 67]), 'C13': (36, [58, 62, 64, 69]),
    'Gm9': (43, [58, 62, 65, 69]), 'Am7': (45, [55, 60, 64, 67]),
    'Em7b5': (40, [55, 58, 62, 65]), 'A7sus': (45, [55, 59, 62, 64]),
    'A7b9': (45, [55, 58, 61, 64]), 'Ebmaj9': (39, [55, 58, 62, 65]),
    'Dm11': (38, [53, 60, 64, 67]), 'F6': (41, [57, 60, 62, 67]),
}
SECTIONS = [
    ('Window light', ['Dm9','Bbmaj9','Fmaj9','C13','Gm9','Bbmaj9','Em7b5','A7sus']),
    ('Moss and rain', ['Dm11','Gm9','C13','Fmaj9','Bbmaj9','Em7b5','Am7','Dm9']),
    ('Paper lanterns', ['Fmaj9','Am7','Bbmaj9','C13','Dm9','Gm9','Em7b5','A7b9']),
    ('The quiet room', ['Bbmaj9','F6','Gm9','Dm11','Ebmaj9','Bbmaj9','A7sus','Dm9']),
    ('Passing clouds', ['Dm9','Am7','Gm9','C13','Fmaj9','Bbmaj9','Em7b5','A7sus']),
    ('Soft footsteps', ['Gm9','C13','F6','Bbmaj9','Em7b5','A7b9','Dm9','Dm11']),
    ('Late train home', ['Fmaj9','C13','Dm11','Am7','Bbmaj9','Ebmaj9','Gm9','A7sus']),
    ('Moonlit water', ['Dm11','Bbmaj9','Gm9','F6','Ebmaj9','Em7b5','A7sus','Dm9']),
    ('Letters at dawn', ['Bbmaj9','Am7','Gm9','C13','Fmaj9','Em7b5','A7b9','Dm9']),
    ('First light', ['Dm9','Gm9','Bbmaj9','Fmaj9','Em7b5','A7sus','Dm11','Dm9']),
]
MELODIES = [
    [(0.5,2),(1.75,1),(3.25,0)], [(0.75,3),(2.5,2)],
    [(0.25,1),(1.5,2),(3,3)], [(1,2),(2.75,0)],
    [(0.5,0),(2.25,1),(3.5,2)],
]

def smooth_noise(rng, duration, low, high):
    n = int(duration*SR)
    source = rng.normal(0,1,n).astype(np.float32)
    frequencies = np.fft.rfftfreq(n,1/SR)
    response = 1/(1+(frequencies/high)**6)
    if low:
        response *= 1-np.exp(-(frequencies/low)**4)
    signal = np.fft.irfft(np.fft.rfft(source)*response,n).astype(np.float32)
    return signal / max(.01,float(np.std(signal)))

def voice(midi, duration, kind, velocity, seed):
    t = np.arange(int(duration*SR),dtype=np.float32)/SR
    frequency = 440*2**((midi-69)/12)
    # Slow, very shallow tine drift rather than a conspicuous chorus wobble.
    phase = 2*np.pi*frequency*t + .011*np.sin(2*np.pi*.43*t+seed)
    release = np.minimum((duration-t)/.12,1)
    if kind == 'pad':
        signal = np.sin(phase)+.25*np.sin(phase*1.0013+.2)
        envelope = np.minimum(t/.75,1)*np.minimum((duration-t)/.85,1)
    elif kind == 'bass':
        signal = np.sin(phase)+.31*np.sin(2*phase)+.12*np.sin(3*phase)
        envelope = np.minimum(t/.009,1)*np.exp(-t/1.2)*release
    elif kind == 'felt':
        signal = (np.sin(phase)*np.exp(-t/1.8)
                  +.23*np.sin(2*phase+.04)*np.exp(-t/.85)
                  +.085*np.sin(3.002*phase)*np.exp(-t/.4)
                  +.025*np.sin(4*phase)*np.exp(-t/.19))
        envelope = np.minimum(t/.014,1)*release
    else:
        # Rounded Rhodes-like tine: predominantly a warm fundamental, with a
        # short bell/hammer attack. No bright looping FM arpeggio.
        signal = (np.sin(phase)*np.exp(-t/2.5)
                  +.22*np.sin(2*phase)*np.exp(-t/1.15)
                  +.065*np.sin(3*phase)*np.exp(-t/.44)
                  +.037*np.sin(2.007*phase+.3)*np.exp(-t/.31)
                  +.012*np.sin(5*phase)*np.exp(-t/.13))
        envelope = np.minimum(t/.008,1)*release
    return (np.tanh(signal*1.12)*envelope*velocity).astype(np.float32)

def drum_bank(rng):
    banks = {key:[] for key in ['kick','snare','hat','shaker','rim','tom']}
    for variant in range(8):
        t = np.arange(int(.42*SR),dtype=np.float32)/SR
        phase = 2*np.pi*(49*t+1.6*(1-np.exp(-t*35)))
        banks['kick'].append((np.sin(phase)*np.minimum(t/.0025,1)*np.exp(-t*14)).astype(np.float32))
        noise = smooth_noise(rng,.42,430,3700)
        brush = noise*np.minimum(t/.003,1)*np.exp(-t*(21+variant*.4))
        body = np.sin(2*np.pi*(176+variant*2)*t)*np.exp(-t*31)
        banks['snare'].append((brush*.36+body*.24).astype(np.float32))
        banks['tom'].append((np.sin(2*np.pi*(93*t+.24*(1-np.exp(-t*22))))*np.exp(-t*14)*np.minimum(t/.004,1)).astype(np.float32))
        for key,lo,hi,decay in [('hat',3200,6900,82),('shaker',1700,5800,49)]:
            tt = t[:int(.19*SR)]
            n = smooth_noise(rng,.19,lo,hi)
            banks[key].append((n*np.exp(-tt*decay)*np.minimum(tt/.001,1)*.30).astype(np.float32))
        banks['rim'].append(((np.sin(2*np.pi*920*t)+.45*np.sin(2*np.pi*1623*t))*np.exp(-t*92)*np.minimum(t/.001,1)).astype(np.float32))
    return banks

metrics = {'bpm':BPM,'bars':BARS,'durationSeconds':LENGTH,'sampleRate':SR,'sections':[s[0] for s in SECTIONS],'stems':{}}
for stem, filename in enumerate(['lantern-drift','lantern-pulse','lantern-storm']):
    rng = np.random.default_rng(251115+stem*191)
    mix = np.zeros((int(LENGTH*SR),2),np.float32)
    drums = drum_bank(rng)
    def add(at, signal, pan=0):
        start = int(at*SR)
        if start<0:
            signal=signal[-start:];start=0
        n = min(len(signal),len(mix)-start)
        if n<=0:return
        mix[start:start+n,0] += signal[:n]*np.sqrt((1-pan)/2)
        mix[start:start+n,1] += signal[:n]*np.sqrt((1+pan)/2)
    def note(at, midi, duration, volume, kind='rhodes', pan=0):
        add(at,voice(midi,duration,kind,volume,rng.uniform(0,6)),pan)
    def hit(at, kind, volume, pan=0):
        add(at,drums[kind][rng.integers(0,8)]*volume,pan)
    def human(beat, late=0):
        return beat*BEAT+late+rng.uniform(-.007,.007)
    for bar in range(BARS):
        section, within = divmod(bar,16)
        _, progression = SECTIONS[section%len(SECTIONS)]
        root, chord = CHORDS[progression[within//2]]
        at = bar*BAR
        breath = within in (14,15) and section%3!=2
        if stem==0:
            if bar%2==0:
                # Strummed chord order changes between sections, with silence
                # and softer responses inside each two-bar phrase.
                order = list(reversed(chord)) if section%4==2 else chord
                for j,midi in enumerate(order):
                    note(at+.012+j*.021,midi,BAR*2+.35,.103*rng.uniform(.88,1.09),'rhodes',(j-1.5)*.19)
                if section%3!=1:
                    for midi,pan in [(chord[0],-.45),(chord[2],.45)]:
                        note(at,midi,BAR*2+.6,.016,'pad',pan)
            elif not breath and within%4==1:
                for j in [0,2,3]:
                    note(at+human(2.63)+j*.018,chord[j],1.7,.035,'rhodes',(j-1.5)*.17)
            if within%4 in (0,2) and (section>0 or within>3) and not breath:
                motif=MELODIES[(section+within//4)%len(MELODIES)]
                for beat,k in motif:
                    if within%8==6 and k==2:continue
                    note(at+human(beat,.018),chord[k]+(12 if section%4==2 else 0),1.9,.044*rng.uniform(.85,1.12),'felt',rng.uniform(-.28,.28))
        elif stem==1:
            patterns = [[0,1.75,2.5],[0,1.5,2.75,3.5],[0,.75,2.5],[0,2,3.25]]
            kickbeats = [0] if breath else patterns[(section+bar//4)%len(patterns)]
            for beat in kickbeats:
                hit(at+human(beat),'kick',.43 if beat==0 else .29*rng.uniform(.85,1.1))
            bassbeats = [0] if breath else [0,1.75,3.25]
            for i,beat in enumerate(bassbeats):
                bass=root+(12 if i==2 and section%3==1 else 0)
                note(at+human(beat,.012),bass,1.15 if i==0 else .67,.24 if i==0 else .17,'bass')
            if not breath:
                for beat in [1,3]:
                    hit(at+human(beat,.023),'snare',.24*rng.uniform(.9,1.06),.055)
                    if section%3==1:hit(at+human(beat+.035,.025),'rim',.029,-.08)
                for step in range(8):
                    if (within+step)%11==0:continue
                    swing=.09*BEAT if step%2 else 0
                    hit(at+human(step*.5,swing),'hat',(.062 if step%2 else .038)*rng.uniform(.75,1.15),-.3)
                    if section%3==2 and step%2:
                        hit(at+human(step*.5+.03,swing),'shaker',.043,.37)
                if within%8==7:
                    hit(at+human(3.68,.019),'snare',.058,-.15)
                    hit(at+human(3.86,.026),'rim',.032,.23)
            if within==15:
                hit(at+3.45*BEAT,'shaker',.045,.15)
        else:
            # Extra guardian energy stays in the warm mid/low range. It adds
            # weight and ghost notes rather than shrill, urgent synth loops.
            if within%8 not in (6,7):
                for beat in [.5,2.25]:
                    hit(at+human(beat,.014),'tom',.17,-.23 if beat<2 else .23)
                for beat in [.75,2.75,3.5]:
                    note(at+human(beat,.008),root+12,.7,.10,'bass',-.1 if beat<2 else .1)
                if bar%2==1:
                    for j,k in enumerate([2,1,3]):
                        note(at+human(.75+j*.95),chord[k],1.1,.049,'felt',(j-1)*.28)
            if within%4==3:
                for beat,volume in [(2.75,.055),(3.4,.043),(3.75,.061)]:
                    hit(at+human(beat,.024),'snare',volume,rng.uniform(-.3,.3))
        if (bar+1)%32==0:
            print(filename,'arranged',bar+1,'/',BARS,'bars',flush=True)
    # Render a small diffuse room offline; bass/drum layer keeps a drier center.
    dry = mix.copy()
    sends = [(.073,.10),(.119,.075),(.181,.055),(.293,.042),(.431,.028),(.683,.018)]
    room = 1 if stem==0 else .27
    for delay,gain in sends:
        shift=int(delay*SR)
        mix[shift:,0] += dry[:-shift,1]*(gain*room)
        mix[shift:,1] += dry[:-shift,0]*(gain*room)
    del dry
    if stem==0:
        # Barely audible filtered room/vinyl grain. Sparse ticks are kept well
        # below melody level, avoiding scratchy noise or false gameplay cues.
        chunk=int(12*SR)
        for start in range(0,len(mix),chunk):
            n=min(chunk,len(mix)-start)
            grain=smooth_noise(rng,n/SR,80,3200)[:n]*.00075
            mix[start:start+n,0]+=grain
            mix[start:start+n,1]+=grain*.88
    mix=np.tanh(mix*1.08)
    peak=float(np.max(np.abs(mix)))
    rms=float(np.sqrt(np.mean(mix**2)))
    gain=min([.17,.14,.12][stem]/max(rms,.001),.84/max(peak,.01))
    mix*=gain
    fade=int(1.1*SR)
    mix[:fade]*=np.linspace(0,1,fade,dtype=np.float32)[:,None]
    mix[-fade:]*=np.linspace(1,0,fade,dtype=np.float32)[:,None]
    path=SCRATCH/(filename+'.wav')
    with wave.open(str(path),'wb') as wav:
        wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(SR)
        wav.writeframes((mix*32767).astype('<i2').tobytes())
    subprocess.run([encoder,'-y','-hide_banner','-loglevel','error','-i',str(path),
                    '-af','highpass=f=28,lowpass=f=5200,alimiter=limit=0.89:level=false',
                    '-codec:a','libmp3lame','-b:a','96k','-metadata','title=Wispbound - '+filename,
                    '-metadata','artist=Wispbound original score',str(OUT/(filename+'.mp3'))],check=True)
    metrics['stems'][filename]={'peakBeforeEncoding':float(np.max(np.abs(mix))),'rmsBeforeEncoding':float(np.sqrt(np.mean(mix**2))),'bytes':(OUT/(filename+'.mp3')).stat().st_size}
    print(filename,'rendered',round(LENGTH,2),'seconds',metrics['stems'][filename],flush=True)
    del mix
# A short, independently playable audition of the normal flight mix.
preview_start=min(16*BAR,LENGTH*.25)
preview_length=min(45,LENGTH-preview_start)
command=[encoder,'-y','-hide_banner','-loglevel','error']
for filename in ['lantern-drift','lantern-pulse','lantern-storm']:
    command+=['-ss',str(preview_start),'-i',str(OUT/(filename+'.mp3'))]
command+=['-filter_complex',f"[0:a][1:a][2:a]amix=inputs=3:weights='0.27 0.28 0.04':normalize=0,atrim=duration={preview_length},loudnorm=I=-19:TP=-1.5:LRA=9,afade=t=in:d=0.35,afade=t=out:st={preview_length-1.5}:d=1.5",'-t',str(preview_length),'-codec:a','libmp3lame','-b:a','128k',str(OUT/'lantern-hours-preview.mp3')]
subprocess.run(command,check=True)
(OUT/'README.txt').write_text('Original Wispbound adaptive lo-fi score. No third-party samples, recordings or melodies.\nComposed offline by scripts/compose-adaptive-music.py.\n78 BPM, 160 arranged bars (8m12s): warm electric piano, soft felt-key melodies, rootless jazz voicings, rounded bass, swung brushed drums and a quiet diffuse room.\nTen harmonic sections and written breathing spaces vary the arrangement. Three equal-length stems stream as MP3s; scene changes adjust volume without synthesizing or allocating an audio graph during gameplay.\n',encoding='utf-8')
(SCRATCH/'render-metrics.json').write_text(json.dumps(metrics,indent=2),encoding='utf-8')
print('All synchronized lo-fi stems complete.',flush=True)
