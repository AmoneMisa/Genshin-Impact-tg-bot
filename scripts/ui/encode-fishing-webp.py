"""Package the painted fishing keyframes as animated WebP files."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[2]
source = root / 'art-source/fishing/painted-frames.png'
output = root / 'webapp/art/fishing'
output.mkdir(parents=True, exist_ok=True)
sheet = Image.open(source).convert('RGB')
# Actual panel boundaries in the illustration.
columns = [0, 314, 627, 941, 1254]
rows = [0, 188, 376, 565, 753, 972, 1254]
sequences = [
    ('idle', [0, 1, 2, 3, 2, 1], [320] * 6, 0),
    ('casting', [0, 1, 2, 3], [150] * 4, 1),
    ('waiting', [0, 1, 2, 3], [300] * 4, 0),
    ('pulling', [0, 1, 2, 3], [160, 160, 160, 170], 1),
    ('success', [0, 1, 2, 3], [240, 240, 300, 900], 1),
    ('failure', [0, 1, 2, 3], [240, 240, 300, 900], 1),
]
for row, (name, order, durations, loop) in enumerate(sequences):
    tiles = []
    for column in range(4):
        tile = sheet.crop((columns[column] + 2, rows[row] + 2,
                           columns[column + 1] - 2, rows[row + 1] - 2))
        tiles.append(ImageOps.pad(tile, (384, 256), method=Image.Resampling.LANCZOS,
                                  color='#10121e', centering=(0.5, 0.5)))
    frames = [tiles[index] for index in order]
    target = output / f'{name}.webp'
    frames[0].save(target, format='WEBP', save_all=True, append_images=frames[1:],
                   duration=durations, loop=loop, quality=86, method=6)
    if name == 'idle':
        tiles[0].save(output / 'poster.webp', format='WEBP', quality=90, method=6)
    with Image.open(target) as animation:
        assert animation.n_frames == len(frames)
        assert animation.size == (384, 256)
        assert animation.info['loop'] == loop
        print(f'{name}: {animation.n_frames} painted frames, {sum(durations)} ms, {target.stat().st_size} bytes')
