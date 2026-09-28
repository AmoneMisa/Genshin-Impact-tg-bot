"""Celestial recurve bow (Blender build). Bow in the XZ plane, front toward -Y.

Flat lacquered limbs (tapered elliptical-profile curves) with gold inlay edges
and filigree, crystal leaf tips, a leather-wound grip, a boolean-cut crescent
centrepiece with a gem, and a glowing string.
"""

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import materials as m  # noqa: E402

c.reset()


def lacquer(nt, bsdf, tc):
    swirl = c.noise(nt, tc.outputs["Object"], 4, detail=5, distortion=1.5)
    nt.links.new(c.ramp(nt, swirl, [(0.3, (0.9, 0.88, 0.9)), (0.7, (0.97, 0.94, 0.92))]), bsdf.inputs["Base Color"])
    nt.links.new(c.ramp(nt, swirl, [(0.3, (0.22, 0.22, 0.22)), (0.7, (0.14, 0.14, 0.14))]), bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = 0.15


LACQUER = c.procedural_material("bowLacquer", lacquer)
GOLD = c.simple_material("bowGold", (0.92, 0.68, 0.32), metallic=1.0, roughness=0.24)
CRYSTAL = c.simple_material("bowCrystal", (0.72, 0.5, 1.0), roughness=0.05, emission=(0.62, 0.4, 1.0), strength=1.2)
STRING = c.simple_material("bowString", (0.92, 0.85, 1.0), roughness=0.3, emission=(0.85, 0.75, 1.0), strength=2.5)
GRIP = m.leather("bowGrip", dark=(0.16, 0.08, 0.14), light=(0.34, 0.2, 0.3))

UPPER = [(0.6, 0, 0.2), (0.55, 0, 0.62), (0.33, 0, 1.08), (0.05, 0, 1.44), (-0.1, 0, 1.64), (-0.02, 0, 1.8)]


def mirror_z(points):
    return [(x, y, -z) for x, y, z in points]


limbs = [c.flat_curve("limb", pts, width=0.085, thickness=0.04, taper=(1.0, 0.32)) for pts in (UPPER, mirror_z(UPPER))]
limb = c.join(limbs, "limbs")
c.smooth(limb, 40)
c.set_material(limb, LACQUER)

gold = []
for pts in (UPPER, mirror_z(UPPER)):
    for y in (-0.078, 0.078):
        gold.append(c.flat_curve("inlay", [(x, y, z) for x, _, z in pts], width=0.01, thickness=0.012, taper=(1.0, 0.4)))
# Filigree scrolls on the limb faces.
for z_sign in (1, -1):
    for x, z in ((0.55, 0.55), (0.37, 1.0), (0.12, 1.36)):
        pts = []
        for i in range(24):
            t = i / 23
            a = t * 1.1 * math.tau
            r = 0.07 * (1 - t * 0.7)
            pts.append((x + math.cos(a) * r, -0.05, z_sign * (z + math.sin(a) * r)))
        gold.append(c.curve_tube("scroll", pts, 0.008, taper=(1.0, 0.5)))


leaves = []
for z_sign in (1, -1):
    for (x, z), tilt, size in (((-0.06, 1.64), -0.5, 0.36), ((0.56, 0.62), 0.9, 0.24), ((0.2, 1.2), -0.2, 0.18)):
        lf = c.bezier_leaf("leaf", size, size * 0.35)
        lf.rotation_euler = (0, tilt if z_sign > 0 else math.pi - tilt, 0)
        lf.location = (x, -0.01, z_sign * z)
        c.activate(lf)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        leaves.append(lf)
crystals = c.join(leaves, "crystalLeaves")
c.smooth(crystals, 30)

# Grip: core + leather strip, gold collars.
bpy.ops.mesh.primitive_cylinder_add(radius=0.06, depth=0.42, vertices=28, location=(0.62, 0, 0))
grip_core = bpy.context.active_object
c.set_material(grip_core, GRIP)
wrap = c.helix_wrap("gripWrap", radius=0.064, height=0.38, turns=6, strip=0.06, z0=-0.19)
wrap.location.x = 0.62
c.activate(wrap)
bpy.ops.object.transform_apply(location=True)
c.smooth(wrap, 60)
c.set_material(wrap, GRIP)
for z in (0.21, -0.21):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.068, minor_radius=0.016, major_segments=32, minor_segments=8, location=(0.62, 0, z))
    gold.append(bpy.context.active_object)

# Crescent: a disc minus an offset disc (real boolean), solidified and bevelled.
bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=0.035, vertices=64, location=(0.5, -0.07, 0), rotation=(math.pi / 2, 0, 0))
crescent = bpy.context.active_object
bpy.ops.mesh.primitive_cylinder_add(radius=0.14, depth=0.2, vertices=64, location=(0.58, -0.07, 0.01), rotation=(math.pi / 2, 0, 0))
c.boolean_cut(crescent, bpy.context.active_object)
c.add_bevel(crescent, width=0.008, segments=2, angle=30)
c.apply_modifiers(crescent)
gold.append(crescent)

bpy.ops.mesh.primitive_ico_sphere_add(radius=0.06, subdivisions=1, location=(0.58, -0.1, 0))
gem = bpy.context.active_object
gem.scale = (0.8, 0.6, 1.3)
gem.name = "centerGem"
crystals = c.join([crystals, gem], "crystals")
c.set_material(crystals, CRYSTAL)

# String between the tips.
tip = UPPER[-1]
bpy.ops.mesh.primitive_cylinder_add(radius=0.006, depth=tip[2] * 2, vertices=8, location=(tip[0], 0, 0))
string = bpy.context.active_object
string.name = "string"
c.set_material(string, STRING)

trim = c.join(gold, "gold")
c.smooth(trim, 50)
c.set_material(trim, GOLD)

c.export(c.output_path())
