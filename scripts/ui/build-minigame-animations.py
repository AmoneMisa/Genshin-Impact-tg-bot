"""Encode finite, lightweight WebP scenes from existing game artwork. No runtime canvas/WebGL."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'webapp/art/minigames'
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 320

def save(name, frames, duration=80):
    frames[0].save(OUT / (name + '.webp'), save_all=True, append_images=frames[1:],
                   duration=duration, loop=1, quality=65, method=6, minimize_size=True)
    print(name, (OUT / (name + '.webp')).stat().st_size, 'bytes')

forge = Image.open(ROOT / 'webapp/art/world/v1/builds/forge/small-512.webp').convert('RGBA')
forge.thumbnail((300, 280), Image.Resampling.LANCZOS)
frames = []
for i in range(16):
    frame = Image.new('RGBA', (320, 280), '#100e12')
    glow = Image.new('RGBA', frame.size)
    d = ImageDraw.Draw(glow)
    pulse = math.sin(i / 16 * math.pi * 2)
    d.ellipse((65, 115, 255, 265), fill=(234, 99, 22, round(35 + 15 * pulse)))
    frame.alpha_composite(glow.filter(ImageFilter.GaussianBlur(24)))
    frame.alpha_composite(forge, ((320-forge.width)//2, 0))
    d = ImageDraw.Draw(frame)
    for j in range(12):
        phase = (i / 16 + j / 12) % 1
        x = 158 + math.sin(j * 2.4) * phase * 56
        y = 165 - phase * 94
        d.ellipse((x,y,x+2,y+2), fill=(255,193,93,round((1-phase)*190)))
    frames.append(frame.convert('RGB'))
frames[0].save(OUT/'forge-idle.webp', quality=78)
save('forge-action', frames)

names = ['gold', 'moonDew', 'ironOre']
remaining = {'gold':12, 'moonDew':5, 'ironOre':3}
segments = []
while any(remaining.values()):
    candidates = [n for n in names if remaining[n] and (not segments or n != segments[-1])]
    key = max(candidates or [n for n in names if remaining[n]], key=lambda n:remaining[n])
    segments.append(key); remaining[key]-=1
colors = {'gold':'#66502b', 'moonDew':'#254c57', 'ironOre':'#383d44'}
paths = {'gold':'icon-etc_adena_i00', 'moonDew':'icon-etc_lesser_potion_blue_i00', 'ironOre':'icon-etc_mithril_ore_i00'}
icons = {key:Image.open(ROOT/f'webapp/art/l2/{value}-128.webp').convert('RGBA').resize((26,26),Image.Resampling.LANCZOS) for key,value in paths.items()}
base = Image.new('RGBA',(SIZE,SIZE))
d = ImageDraw.Draw(base)
center = SIZE/2
for i,name in enumerate(segments):
    start = -90 + i*18
    d.pieslice((12,12,SIZE-12,SIZE-12),start,start+18,fill=colors[name],outline='#98804c',width=1)
    theta = math.radians(start+9)
    base.alpha_composite(icons[name],(round(center+math.cos(theta)*110)-13,round(center+math.sin(theta)*110)-13))
d = ImageDraw.Draw(base)
for inset,width,color in [(6,4,'#cfb16b'),(12,2,'#4d3c25'),(16,1,'#dbc38b')]:
    d.ellipse((inset,inset,SIZE-inset,SIZE-inset),outline=color,width=width)
d.ellipse((137,137,183,183),fill='#27221a',outline='#dabd76',width=2)
d.ellipse((154,154,166,166),fill='#d5ba70')

def wheel(angle):
    frame = Image.new('RGBA',(SIZE,SIZE),'#100e12')
    frame.alpha_composite(base.rotate(angle,resample=Image.Resampling.BICUBIC))
    ImageDraw.Draw(frame).polygon([(147,4),(173,4),(160,29)],fill='#f0d391',outline='#9c7e45')
    return frame.convert('RGB')
wheel(9).save(OUT/'wheel-idle.webp',quality=80)
for name in names:
    index=segments.index(name)
    finish=9+index*18+720
    frames=[wheel(9+(finish-9)*(1-(1-i/23)**3)) for i in range(24)]
    frames[-1].save(OUT/f'wheel-{name}-result.webp',quality=78)
    save('wheel-'+name,frames,70)
