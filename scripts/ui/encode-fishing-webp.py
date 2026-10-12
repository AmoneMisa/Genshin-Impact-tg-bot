"""Encode the minimal water/rod/fish artwork under a mobile animation budget."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[2]
source = root / 'art-source/fishing/lightweight-frames.png'
output = root / 'webapp/art/fishing'
output.mkdir(parents=True, exist_ok=True)
sheet = Image.open(source).convert('RGB')
# Actual panel boundaries in the illustration.
columns = [0, 256, 512, 768, 1024]
rows = [0, 228, 467, 698, 935, 1187, 1443]
size = (256, 160)
sequences = [
    ('idle', [0], [1000], 0),
    ('casting', [0, 2, 3], [200] * 3, 1),
    ('waiting', [0, 1, 3], [400] * 3, 0),
    ('pulling', [0, 2, 3], [210, 210, 230], 1),
    ('success', [0, 1, 3], [300, 300, 900], 1),
    ('failure', [0, 1, 2, 3], [200, 200, 300, 900], 1),
]
for row, (name, order, durations, loop) in enumerate(sequences):
    tiles = []
    for column in range(4):
        tile = sheet.crop((columns[column] + 2, rows[row] + 2,
                           columns[column + 1] - 2, rows[row + 1] - 2))
        tiles.append(ImageOps.pad(tile, size, method=Image.Resampling.LANCZOS,
                                  color='#122b32', centering=(0.5, 0.5)))
    frames = [tiles[index] for index in order]
    target = output / f'{name}.webp'
    frames[0].save(target, format='WEBP', save_all=True, append_images=frames[1:],
                   duration=durations, loop=loop, quality=48, method=6,
                   minimize_size=True)
    if name == 'idle':
        tiles[0].save(output / 'poster.webp', format='WEBP', quality=55, method=6)
    if name in ('success', 'failure'):
        frames[-1].save(output / f'{name}-still.webp', format='WEBP', quality=55, method=6)
    with Image.open(target) as animation:
        assert animation.n_frames == len(frames)
        assert animation.size == size
        if len(frames) > 1:
            assert animation.info['loop'] == loop
        assert target.stat().st_size <= 24000
        print(f'{name}: {animation.n_frames} frames, {sum(durations)} ms, {target.stat().st_size} bytes')
