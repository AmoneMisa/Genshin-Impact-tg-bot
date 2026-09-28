"""Treasure chest for the chest mini-game (Blender build). Z-up, front toward -Y.

Named nodes the runtime animates:
  lid       - origin on the hinge (back top edge), rotates open around X
  glow      - emissive plane inside, lights the opening
  treasure  - coins and gems, hidden for empty chests
Everything else is the static body.
"""

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import materials as m  # noqa: E402

c.reset()

W, D, H = 1.0, 0.64, 0.5      # body width (x), depth (y), height (z)
R = D / 2                      # lid radius (half-cylinder spanning the depth)


def wood(nt, bsdf, tc):
    obj = tc.outputs["Object"]
    # Horizontal planks: a wave texture along Z gives the plank seams.
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "Z"
    wave.inputs["Scale"].default_value = 3.2
    wave.inputs["Distortion"].default_value = 1.5
    wave.inputs["Detail"].default_value = 3
    nt.links.new(obj, wave.inputs["Vector"])
    grain = c.noise(nt, obj, 40, detail=6, stretch=(1, 0.08, 1))
    seams = c.ramp(nt, wave.outputs["Fac"], [(0.0, (0.06, 0.03, 0.015)), (0.08, (0.32, 0.17, 0.08)), (0.6, (0.46, 0.26, 0.12)), (1.0, (0.36, 0.2, 0.09))])
    tint = c.ramp(nt, grain, [(0.3, (0.75, 0.75, 0.75)), (0.7, (1.1, 1.05, 1.0))])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1
    nt.links.new(seams, mix.inputs[6])
    nt.links.new(tint, mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    nt.links.new(c.ramp(nt, grain, [(0.3, (0.75, 0.75, 0.75)), (0.7, (0.55, 0.55, 0.55))]), bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = 0
    c.bump(nt, bsdf, wave.outputs["Fac"], strength=0.4, distance=0.01)


WOOD = c.procedural_material("chestWood", wood)
BRASS = m.brass("chestBrass")
GLOW = c.simple_material("chestGlow", (1.0, 0.78, 0.36), roughness=1.0, emission=(1.0, 0.72, 0.3), strength=4.0)
COIN = c.simple_material("coinGold", (1.0, 0.78, 0.3), metallic=1.0, roughness=0.18)
GEMS = [c.simple_material(f"gem{i}", col, roughness=0.05, emission=col, strength=1.2)
        for i, col in enumerate(((0.3, 0.9, 0.75), (1.0, 0.35, 0.55), (0.5, 0.6, 1.0)))]


def with_material(obj, mat):
    c.set_material(obj, mat)
    return obj


# ---------------------------------------------------------------------------
# Body: bevelled box with brass bands, corner guards and a lock plate
# ---------------------------------------------------------------------------

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, H / 2))
box = bpy.context.active_object
box.scale = (W, D, H)
bpy.ops.object.transform_apply(scale=True)
c.add_bevel(box, width=0.02, segments=3, angle=30)
c.apply_modifiers(box)
body_parts = [with_material(box, WOOD)]

brass_body = []
for x in (-0.3, 0.3):   # vertical bands wrapping front, bottom and back
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0, H / 2))
    band = bpy.context.active_object
    band.scale = (0.08, D + 0.02, H + 0.01)
    bpy.ops.object.transform_apply(scale=True)
    c.add_bevel(band, width=0.006, segments=2)
    c.apply_modifiers(band)
    brass_body.append(band)
for sx in (-1, 1):       # corner guards
    for sy in (-1, 1):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * (W / 2 - 0.035), sy * (D / 2 - 0.035), H / 2))
        guard = bpy.context.active_object
        guard.scale = (0.09, 0.09, H + 0.012)
        bpy.ops.object.transform_apply(scale=True)
        c.add_bevel(guard, width=0.012, segments=2)
        c.apply_modifiers(guard)
        brass_body.append(guard)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -D / 2 - 0.012, H - 0.09))   # lock plate
lock = bpy.context.active_object
lock.scale = (0.16, 0.03, 0.2)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=0.1, vertices=16, location=(0, -D / 2 - 0.02, H - 0.08), rotation=(math.pi / 2, 0, 0))
c.boolean_cut(lock, bpy.context.active_object)   # keyhole
c.add_bevel(lock, width=0.008, segments=2)
c.apply_modifiers(lock)
brass_body.append(lock)
for x in (-0.3, 0.3):    # rivets on the front bands
    for z in (0.1, 0.25, 0.4):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.014, segments=10, ring_count=6, location=(x, -D / 2 - 0.012, z))
        brass_body.append(bpy.context.active_object)
body_parts.append(with_material(c.join(brass_body, "bodyBrass"), BRASS))
body = c.join(body_parts, "body")
c.smooth(body, 35)

# ---------------------------------------------------------------------------
# Lid: half-cylinder with its origin on the hinge (back top edge)
# ---------------------------------------------------------------------------

bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=W, vertices=40, location=(0, 0, H), rotation=(0, math.pi / 2, 0))
lid_wood = bpy.context.active_object
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, H - R / 2))
# Keep only the upper half: cut away everything below the rim with a box.
cutter = bpy.context.active_object
cutter.scale = (W * 1.2, D * 1.2, R)
bpy.ops.object.transform_apply(scale=True)
c.boolean_cut(lid_wood, cutter)
c.add_bevel(lid_wood, width=0.015, segments=2, angle=30)
c.apply_modifiers(lid_wood)
lid_parts = [with_material(lid_wood, WOOD)]
lid_brass = []
for x in (-0.3, 0.3):
    bpy.ops.mesh.primitive_torus_add(major_radius=R + 0.008, minor_radius=0.035, major_segments=40, minor_segments=6, location=(x, 0, H), rotation=(0, math.pi / 2, 0))
    arch = bpy.context.active_object
    arch.scale = (1, 1, 0.55)   # flatten the torus into a strap
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0, H - R / 2 - 0.02))
    arch_cut = bpy.context.active_object
    arch_cut.scale = (0.2, D * 1.3, R + 0.04)
    bpy.ops.object.transform_apply(scale=True)
    c.boolean_cut(arch, arch_cut)
    lid_brass.append(arch)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -R - 0.01, H + 0.03))   # hasp
hasp = bpy.context.active_object
hasp.scale = (0.1, 0.025, 0.14)
bpy.ops.object.transform_apply(scale=True)
lid_brass.append(hasp)
lid_parts.append(with_material(c.join(lid_brass, "lidBrass"), BRASS))
lid = c.join(lid_parts, "lid")
c.smooth(lid, 35)
# Hinge pivot: the lid swings around the back top edge.
bpy.context.scene.cursor.location = (0, D / 2, H)
c.activate(lid)
bpy.ops.object.origin_set(type="ORIGIN_CURSOR")

# ---------------------------------------------------------------------------
# Inside: glowing floor and a pile of treasure
# ---------------------------------------------------------------------------

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, H - 0.06))
glow = bpy.context.active_object
glow.name = "glow"
glow.scale = (W - 0.08, D - 0.08, 1)
bpy.ops.object.transform_apply(scale=True)
c.set_material(glow, GLOW)

treasure_parts = []
import random  # noqa: E402
rnd = random.Random(7)
coins = []
for _ in range(26):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.012, vertices=16,
                                        location=(rnd.uniform(-0.38, 0.38), rnd.uniform(-0.2, 0.2), H - 0.05 + rnd.uniform(0, 0.08)),
                                        rotation=(rnd.uniform(-0.5, 0.5), rnd.uniform(-0.5, 0.5), 0))
    coins.append(bpy.context.active_object)
treasure_parts.append(with_material(c.join(coins, "coins"), COIN))
for i, mat in enumerate(GEMS):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.055, subdivisions=1, location=(-0.22 + i * 0.22, rnd.uniform(-0.1, 0.1), H + 0.02))
    treasure_parts.append(with_material(bpy.context.active_object, mat))
treasure = c.join(treasure_parts, "treasure")

c.export(c.output_path())
