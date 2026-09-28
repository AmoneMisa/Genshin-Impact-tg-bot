"""Dark-paladin great helm (Blender build). Z-up, face toward -Y.

Real boolean cuts for the visor slit and breathing holes, a lathed and
solidified shell, gold trim curves following the surface, and a crown of points.
"""

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import materials as m  # noqa: E402

c.reset()

# ---------------------------------------------------------------------------
# Shell: profile revolved around Z, then given thickness
# ---------------------------------------------------------------------------

PROFILE = [(0.0, 0.62), (0.16, 0.6), (0.3, 0.52), (0.39, 0.38), (0.42, 0.2), (0.42, -0.2), (0.44, -0.38), (0.47, -0.46)]
R = 0.42  # shell radius at visor height

helm = c.mesh_from("helm", [(x, 0, z) for x, z in PROFILE], [], edges=[(i, i + 1) for i in range(len(PROFILE) - 1)])
screw = helm.modifiers.new("Revolve", "SCREW")
screw.axis = "Z"
screw.steps = 72
screw.render_steps = 72
screw.use_merge_vertices = True
solid = helm.modifiers.new("Thickness", "SOLIDIFY")
solid.thickness = 0.03
solid.offset = -1
c.add_subsurf(helm, 1)
c.apply_modifiers(helm)

# Visor slit: a thin curved box through the front wall only.
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.35, 0.08))
slit = bpy.context.active_object
slit.scale = (0.62, 0.3, 0.035)
bpy.ops.object.transform_apply(scale=True)
c.boolean_cut(helm, slit)

# Breathing holes: two fans of small cylinders on the lower cheeks.
cutters = []
for side in (-1, 1):
    for row in range(2):
        for k in range(3):
            a = side * (0.3 + k * 0.14)
            z = -0.12 - row * 0.1
            bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=0.3, vertices=12,
                                                location=(math.sin(a) * R, -math.cos(a) * R, z),
                                                rotation=(math.pi / 2, 0, a))
            cutters.append(bpy.context.active_object)
holes = c.join(cutters, "holes")
c.boolean_cut(helm, holes)
c.smooth(helm, 40)
c.set_material(helm, m.black_steel("helmSteel"))

# Dark liner visible through the slit and holes.
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.37, location=(0, 0, 0.05), segments=32, ring_count=16)
liner = bpy.context.active_object
liner.name = "liner"
liner.scale = (1, 1, 1.35)
c.set_material(liner, m.void("helmVoid"))

# ---------------------------------------------------------------------------
# Gold: brow and chin bands around the slit, cross ridge, rim, crown of points
# ---------------------------------------------------------------------------

def arc(z, radius, a0, a1, n=40):
    return [(math.sin(a0 + (a1 - a0) * t / n) * radius, -math.cos(a0 + (a1 - a0) * t / n) * radius, z) for t in range(n + 1)]


gold = []
gold.append(c.curve_tube("brow", arc(0.135, R + 0.012, -1.1, 1.1), 0.02))
gold.append(c.curve_tube("chin", arc(0.025, R + 0.012, -1.1, 1.1), 0.02))
gold.append(c.curve_tube("rim", arc(-0.45, 0.472, -math.pi, math.pi, 72), 0.024, closed=True))
ridge = [(0, -(math.sin(a) * (R + 0.012)), 0.2 + math.cos(a) * (R + 0.012)) for a in [i / 24 * math.pi for i in range(25)]]
gold.append(c.curve_tube("ridge", ridge, 0.022))
gold.append(c.curve_tube("nasal", [(0, -(R + 0.014), 0.02), (0, -(R + 0.016), -0.2), (0, -(0.46), -0.4)], 0.022))
gold.append(c.curve_tube("crownBand", arc(0.4, 0.4, -1.0, 1.0), 0.02))
for k in range(9):
    a = -0.9 + k * 0.225
    tall = k == 4
    bpy.ops.mesh.primitive_cone_add(radius1=0.035, depth=0.22 if tall else 0.13, vertices=10,
                                    location=(math.sin(a) * 0.39, -math.cos(a) * 0.39, 0.47 + (0.05 if tall else 0)))
    gold.append(bpy.context.active_object)
trim = c.join(gold, "goldTrim")
c.smooth(trim, 50)
c.set_material(trim, m.brass("helmGold"))

bpy.ops.mesh.primitive_ico_sphere_add(radius=0.05, subdivisions=1, location=(0, -0.42, 0.42))
gem = bpy.context.active_object
gem.name = "crownGem"
gem.scale = (0.8, 0.6, 1.3)
c.set_material(gem, m.gem("crownGem", (1.0, 0.7, 0.28), 3.0))

c.export(c.output_path())
