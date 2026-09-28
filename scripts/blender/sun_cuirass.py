"""Dark-paladin cuirass with a sun emblem (Blender build). Z-up, front toward -Y.

One continuous torso plate (chest keel, sloped shoulders) with boolean-cut
armholes, layered pauldrons, faulds below the waist, gold trim on every
opening, and a sunburst emblem with a glowing core.
"""

import math
import os
import sys

import bpy
import bmesh

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import materials as m  # noqa: E402

c.reset()
STEEL = m.black_steel("cuirassSteel")
GOLD = m.brass("cuirassGold")
CORE = m.gem("sunCore", (1.0, 0.72, 0.3), 3.0)


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def width(z):
    if z > 0.62:   # shoulders slope in to the neck
        return lerp(0.5, 0.26, smoothstep(0.62, 0.78, z))
    if z > 0.3:
        return lerp(0.52, 0.5, (z - 0.3) / 0.32)
    if z > -0.2:
        return lerp(0.41, 0.52, smoothstep(-0.2, 0.3, z))
    return lerp(0.45, 0.41, (z + 0.7) / 0.5)


def depth(z):
    if z > 0.62:
        return lerp(0.3, 0.2, smoothstep(0.62, 0.78, z))
    return lerp(0.27, 0.32, smoothstep(-0.5, 0.35, z))


def torso_point(u, v):
    a = (u - 0.5) * math.tau          # a = 0 is the front
    z = lerp(-0.7, 0.78, v)
    keel = 1 + 0.07 * max(0.0, math.cos(a)) ** 10 * smoothstep(-0.3, 0.3, z)
    return (width(z) * math.sin(a), -depth(z) * math.cos(a) * keel, z)


torso = c.surface_grid("torso", torso_point, 56, 26, closed_u=True)
solid = torso.modifiers.new("Plate", "SOLIDIFY")
solid.thickness = 0.03
solid.offset = -1
c.add_subsurf(torso, 1)
c.apply_modifiers(torso)
# Armholes through the shoulder slopes.
cutters = []
for side in (-1, 1):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.19, depth=0.5, vertices=40, location=(side * 0.52, 0, 0.52), rotation=(0, math.pi / 2, 0))
    cutters.append(bpy.context.active_object)
c.boolean_cut(torso, c.join(cutters, "armholes"))
c.smooth(torso, 40)
c.set_material(torso, STEEL)

gold = []
# Trim on the neck opening and the hem (loops around the torso surface).
for v, r in ((1.0, 0.024), (0.0, 0.024)):
    pts = [torso_point(i / 64, v) for i in range(64)]
    gold.append(c.curve_tube("hemTrim", pts + [pts[0]], r, closed=True))
# Armhole rims.
for side in (-1, 1):
    pts = [(side * 0.47 + side * 0.03 * math.cos(t / 40 * math.tau), 0.19 * math.cos(t / 40 * math.tau + math.pi / 2), 0.52 + 0.19 * math.sin(t / 40 * math.tau)) for t in range(41)]
    gold.append(c.curve_tube("armTrim", pts, 0.02, closed=True))

# ---------------------------------------------------------------------------
# Pauldrons: three overlapping spherical caps per shoulder with gold rims
# ---------------------------------------------------------------------------

def sphere_cap(name, radius, cap_angle):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=32, ring_count=16)
    obj = bpy.context.active_object
    obj.name = name
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    limit = radius * math.cos(cap_angle)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < limit - 1e-6], context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()
    mod = obj.modifiers.new("Plate", "SOLIDIFY")
    mod.thickness = 0.022
    mod.offset = -1
    c.apply_modifiers(obj)
    return obj


plates = []
for side in (-1, 1):
    for k in range(3):
        r = 0.3 - k * 0.03
        cap = sphere_cap("pauldron", r, math.radians(72))
        ring_r = r * math.sin(math.radians(72))
        rim = c.curve_tube("pauldronRim", [(ring_r * math.cos(t / 48 * math.tau), ring_r * math.sin(t / 48 * math.tau), r * math.cos(math.radians(72))) for t in range(49)], 0.013, closed=True)
        for obj in (cap, rim):
            obj.scale = (1.15, 1.0, 0.9)
            obj.rotation_euler = (0, side * (0.55 + k * 0.2), 0)
            obj.location = (side * (0.5 + k * 0.05), 0, 0.64 - k * 0.12)
            c.activate(obj)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        plates.append(cap)
        gold.append(rim)
pauldrons = c.join(plates, "pauldrons")
c.smooth(pauldrons, 40)
c.set_material(pauldrons, STEEL)

# ---------------------------------------------------------------------------
# Faulds: three overlapping bands under the waist
# ---------------------------------------------------------------------------

bands = []
for k in range(3):
    z1 = -0.7 - k * 0.13
    grow = 0.03 * (k + 1)

    def fauld(u, v, z1=z1, grow=grow):
        a = lerp(-1.3, 1.3, u)
        z = lerp(z1 - 0.15, z1 + 0.02, v)
        return ((0.45 + grow) * math.sin(a), -(0.31 + grow) * math.cos(a), z)
    band = c.surface_grid("fauld", fauld, 40, 4)
    mod = band.modifiers.new("Plate", "SOLIDIFY")
    mod.thickness = 0.02
    mod.offset = -1
    c.apply_modifiers(band)
    bands.append(band)
    gold.append(c.curve_tube("fauldTrim", [fauld(i / 32, 0.0) for i in range(33)], 0.012))
faulds = c.join(bands, "faulds")
faulds["uv_ready"] = False  # joined grids overlap in UV space: let baking unwrap them
c.smooth(faulds, 40)
c.set_material(faulds, STEEL)

# ---------------------------------------------------------------------------
# Sun emblem on the chest
# ---------------------------------------------------------------------------

EY = -depth(0.35) * 1.07 - 0.02   # just proud of the keel
bm = bmesh.new()
verts = [bm.verts.new((math.cos(k / 32 * math.tau) * (0.2 if k % 2 == 0 else 0.13), EY, 0.35 + math.sin(k / 32 * math.tau) * (0.2 if k % 2 == 0 else 0.13))) for k in range(32)]
bm.faces.new(verts)
rays_mesh = bpy.data.meshes.new("rays")
bm.to_mesh(rays_mesh)
bm.free()
rays = bpy.data.objects.new("rays", rays_mesh)
bpy.context.collection.objects.link(rays)
mod = rays.modifiers.new("Solid", "SOLIDIFY")
mod.thickness = 0.02
c.add_bevel(rays, width=0.005, segments=1)
c.apply_modifiers(rays)
gold.append(rays)
bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.014, major_segments=48, minor_segments=8, location=(0, EY - 0.012, 0.35), rotation=(math.pi / 2, 0, 0))
gold.append(bpy.context.active_object)
for side in (-1, 1):
    pts = []
    for i in range(30):
        t = i / 29
        a = side * (t * 1.2 * math.tau)
        r = 0.09 * (1 - t * 0.75)
        pts.append((side * 0.13 + math.cos(a) * r, EY + 0.005, 0.1 + math.sin(a) * r))
    gold.append(c.curve_tube("filigree", pts, 0.011, taper=(1.0, 0.5)))

bpy.ops.mesh.primitive_uv_sphere_add(radius=0.075, segments=32, ring_count=16, location=(0, EY - 0.02, 0.35))
core = bpy.context.active_object
core.name = "sunCore"
core.scale = (1, 0.55, 1)
bpy.ops.object.shade_smooth()
c.set_material(core, CORE)

trim = c.join(gold, "goldTrim")
c.smooth(trim, 50)
c.set_material(trim, GOLD)

c.export(c.output_path())
