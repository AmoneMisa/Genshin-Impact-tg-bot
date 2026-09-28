"""Flower tiara (priest/mage robe helmets), Blender build. Z-up, front toward -Y.

A gold arc with filigree scrolls, a central spire with a tall gem, cupped
five-petal blossoms built from individual petals, and teardrop pearls hanging on
chains of real links.
"""

import math
import os
import sys

import bpy
import bmesh

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

c.reset()

GOLD = c.simple_material("tiaraGold", (0.93, 0.7, 0.34), metallic=1.0, roughness=0.22)
PETAL = c.simple_material("petal", (0.95, 0.42, 0.6), roughness=0.36, emission=(1.0, 0.4, 0.6), strength=0.1)
PEARL = c.simple_material("pearl", (0.97, 0.93, 0.9), metallic=0.1, roughness=0.24)
GEM = c.simple_material("tiaraGem", (1.0, 0.45, 0.7), roughness=0.05, emission=(1.0, 0.4, 0.65), strength=1.4)


def arc(t):
    """Front half of an ellipse around the head: t = 0 left end, 1 right end."""
    a = math.pi * (0.08 + 0.84 * t)
    return (-math.cos(a) * 1.0, -math.sin(a) * 0.35, math.sin(a) * 0.28)


def facing(t):
    """Yaw that turns a front-facing part to face outward at arc position t."""
    x, y, _ = arc(t)
    return math.atan2(x, -y)


def place(obj, location, yaw=0.0, tilt=0.0):
    obj.rotation_euler = (tilt, 0, yaw)
    obj.location = location
    c.activate(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    return obj


gold = []
band_pts = [arc(i / 40) for i in range(41)]
gold.append(c.flat_curve("band", band_pts, width=0.03, thickness=0.018, taper=(1.0, 1.0)))
# Upper filigree: scrolls riding above the band.
for k in range(10):
    t = 0.06 + k / 9 * 0.88
    x, y, z = arc(t)
    flip = 1 if k % 2 else -1
    pts = []
    for i in range(22):
        s = i / 21
        a = flip * s * 1.2 * math.tau + (0 if flip > 0 else math.pi)
        r = 0.065 * (1 - s * 0.75)
        pts.append((math.cos(a) * r, 0, math.sin(a) * r))
    scroll = c.curve_tube("scroll", pts, 0.009, taper=(1.0, 0.45))
    gold.append(place(scroll, (x, y - 0.01, z + 0.075), facing(t)))

# Central spire: two gold leaves and a tall crystal.
cx, cy, cz = arc(0.5)
for side in (-1, 1):
    blade = c.bezier_leaf("spire", 0.46, 0.13, depth=0.012, bevel=0.008)
    # Lean each blade outward about its own base, then move it into place.
    blade.rotation_euler = (0, side * -0.12, 0)
    c.activate(blade)
    bpy.ops.object.transform_apply(rotation=True)
    gold.append(place(blade, (cx + side * 0.035, cy - 0.01, cz + 0.02)))
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.085, subdivisions=1)
gem = bpy.context.active_object
gem.scale = (0.75, 0.55, 1.7)
place(gem, (cx, cy - 0.04, cz + 0.26))
c.set_material(gem, GEM)

# Blossoms: five cupped petals each, big one at the centre.
petals, hearts = [], []
for t, r in ((0.5, 0.2), (0.36, 0.14), (0.64, 0.14), (0.22, 0.125), (0.78, 0.125), (0.1, 0.105), (0.9, 0.105)):
    x, y, z = arc(t)
    z += 0.12 if t == 0.5 else 0.02
    yaw = facing(t)
    for k in range(5):
        petal = c.bezier_leaf("petal", r, r * 0.55, depth=r * 0.06, bevel=r * 0.04)
        petal.rotation_euler = (-0.45, k / 5 * math.tau, 0)   # cup outward, fan around the flower's axis (-Y)
        c.activate(petal)
        bpy.ops.object.transform_apply(rotation=True)
        petals.append(place(petal, (x, y - 0.03, z), yaw))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r * 0.22, segments=16, ring_count=8)
    hearts.append(place(bpy.context.active_object, (x, y - 0.04, z), yaw))
blossoms = c.join(petals, "blossoms")
c.smooth(blossoms, 40)
c.set_material(blossoms, PETAL)
gold += hearts


def teardrop(radius):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=16, ring_count=10)
    obj = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        if v.co.z > 0:
            s = v.co.z / radius
            v.co.x *= 1 - 0.65 * s
            v.co.y *= 1 - 0.65 * s
            v.co.z *= 1.7
    bm.to_mesh(obj.data)
    bm.free()
    return obj


# Hanging pearls on chains of alternating links, longest at the centre.
pearls = []
for k in range(9):
    t = 0.12 + k / 8 * 0.76
    x, y, z = arc(t)
    length = 0.1 + 0.16 * (1 - abs(t - 0.5) * 2)
    links = max(2, round(length / 0.03))
    for i in range(links):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.011, minor_radius=0.0035, major_segments=10, minor_segments=5,
                                         location=(x, y - 0.02, z - 0.03 - (i + 0.5) * length / links),
                                         rotation=(0, math.pi / 2, math.pi / 2 if i % 2 else 0))
        gold.append(bpy.context.active_object)
    drop = teardrop(0.03)
    pearls.append(place(drop, (x, y - 0.02, z - 0.03 - length - 0.03)))
pearl_obj = c.join(pearls, "pearls")
c.smooth(pearl_obj, 80)
c.set_material(pearl_obj, PEARL)

trim = c.join(gold, "gold")
c.smooth(trim, 50)
c.set_material(trim, GOLD)

c.export(c.output_path())
