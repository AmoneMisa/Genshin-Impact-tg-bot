"""Downsize painted art to web-friendly WebP with Blender (no extra image tools needed).

    blender --background --factory-startup --python convert_art.py -- jobs.json

jobs.json: [{"src": "...png", "dst": "...webp", "size": 768, "quality": 82}, ...]
`size` is the longest edge in pixels; aspect ratio is kept.
"""

import json
import os
import sys

import bpy

jobs_path = sys.argv[sys.argv.index("--") + 1]
with open(jobs_path, encoding="utf-8") as f:
    jobs = json.load(f)

scene = bpy.context.scene
# "Standard" keeps the painting's colours exactly; the default view transform
# would tone-map them like a render.
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGBA"

for job in jobs:
    img = bpy.data.images.load(job["src"], check_existing=False)
    w, h = img.size
    scale = min(1.0, job["size"] / max(w, h))
    if scale < 1.0:
        img.scale(max(1, round(w * scale)), max(1, round(h * scale)))
    scene.render.image_settings.quality = job.get("quality", 82)
    os.makedirs(os.path.dirname(job["dst"]), exist_ok=True)
    img.save_render(job["dst"], scene=scene)
    bpy.data.images.remove(img)
    print(f"CONVERTED {job['dst']}")
