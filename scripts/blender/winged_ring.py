"""Winged-heart ring (SS/SSS rings), Blender build. Z-up, front toward -Y.

Bevelled bezier heart with a matching gold rim, translucent bent wings with gold
veins, a little crown and star, on a smooth subdivided band.
"""

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

c.reset()

GOLD = c.simple_material("ringGold", (0.9, 0.66, 0.3), metallic=1.0, roughness=0.26)
# Modest emission: the SSS grade glow multiplies it, and too much blows the heart out to a white blob.
HEART = c.simple_material("heartCrystal", (1.0, 0.5, 0.12), roughness=0.05, emission=(1.0, 0.45, 0.1), strength=0.55)
STAR = c.simple_material("crownStar", (1.0, 0.95, 0.78), roughness=0.05, emission=(1.0, 0.92, 0.7), strength=4.0)
WING = c.simple_material("wingCrystal", (1.0, 0.7, 0.3), roughness=0.06, emission=(1.0, 0.65, 0.25), strength=0.12, alpha=0.26)


def to_front(obj):
    """Curves are drawn in XY; stand them up in the XZ plane, facing -Y."""
    obj.rotation_euler = (math.pi / 2, 0, 0)
    c.activate(obj)
    bpy.ops.object.transform_apply(rotation=True)
    return obj


def bezier_curve(name, points, closed=True, extrude=0.0, bevel=0.0, fill=True, bevel_res=3):
    """points = [(co, handle_left, handle_right)] in XY; returns a mesh object."""
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "2D" if fill else "3D"
    if fill:
        data.fill_mode = "BOTH"
    data.extrude = extrude
    data.bevel_depth = bevel
    data.bevel_resolution = bevel_res
    data.resolution_u = 16
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, (co, hl, hr) in zip(spline.bezier_points, points):
        bp.co = (*co, 0)
        bp.handle_left = (*hl, 0)
        bp.handle_right = (*hr, 0)
    spline.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    c.activate(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.active_object


def heart_points(s):
    return [
        ((0, -0.5 * s), (0.1 * s, -0.4 * s), (-0.1 * s, -0.4 * s)),
        ((-0.5 * s, 0.12 * s), (-0.5 * s, -0.12 * s), (-0.5 * s, 0.38 * s)),
        ((0, 0.26 * s), (-0.2 * s, 0.52 * s), (0.2 * s, 0.52 * s)),
        ((0.5 * s, 0.12 * s), (0.5 * s, 0.38 * s), (0.5 * s, -0.12 * s)),
    ]


def wing_points(length, width):
    return [
        ((0, 0), (-0.05 * width, -0.05 * length), (0.9 * width, 0.1 * length)),
        ((0.55 * width, length), (0.95 * width, 0.75 * length), (0.2 * width, 1.05 * length)),
        ((-0.1 * width, 0.5 * length), (-0.2 * width, 0.8 * length), (-0.1 * width, 0.2 * length)),
    ]


# Band + ribbon knot.
bpy.ops.mesh.primitive_torus_add(major_radius=0.5, minor_radius=0.045, major_segments=96, minor_segments=16, rotation=(math.pi / 2, 0, 0))
band = bpy.context.active_object
band.scale = (1, 1.3, 1)
c.add_subsurf(band, 1)
c.apply_modifiers(band)
gold_parts = [band]
for side in (-1, 1):
    gold_parts.append(c.curve_tube("knot", [(side * 0.02, -0.02, -0.5), (side * 0.12, -0.05, -0.46), (side * 0.16, -0.04, -0.56), (side * 0.08, -0.02, -0.6)], 0.016))

# Heart (bevelled solid) + gold rim tracing the same outline, a bit larger.
heart = to_front(bezier_curve("heart", heart_points(0.46), extrude=0.04, bevel=0.03))
heart.location = (0, -0.02, 0.72)
c.activate(heart)
bpy.ops.object.transform_apply(location=True)
c.smooth(heart, 30)
c.set_material(heart, HEART)
rim = to_front(bezier_curve("heartRim", heart_points(0.5), fill=False, bevel=0.018, bevel_res=2))
rim.location = (0, -0.02, 0.72)
gold_parts.append(rim)

# Crown and star finial.
bpy.ops.mesh.primitive_cylinder_add(radius=0.055, depth=0.06, vertices=24, location=(0, -0.02, 1.0))
gold_parts.append(bpy.context.active_object)
bpy.ops.mesh.primitive_cone_add(radius1=0.03, depth=0.14, vertices=12, location=(0, -0.02, 1.1))
gold_parts.append(bpy.context.active_object)
bpy.ops.mesh.primitive_ico_sphere_add(radius=0.05, subdivisions=1, location=(0, -0.02, 1.21))
star = bpy.context.active_object
star.name = "crownStar"
c.set_material(star, STAR)

# Wings: two pairs per side, filled bezier blades bent backwards, with gold veins.
wings, veins = [], []
for side in (-1, 1):
    for length, width, tilt, lift in ((0.62, 0.3, 1.05, 0.78), (0.42, 0.22, 1.9, 0.62)):
        blade = bezier_curve("wing", wing_points(length, width), bevel=0.0)
        outline = bezier_curve("vein", wing_points(length, width), fill=False, bevel=0.007, bevel_res=1)
        mid = c.curve_tube("midVein", [(0, 0, 0), (width * 0.3, length * 0.45, 0), (width * 0.25, length * 0.85, 0)], 0.006, taper=(1, 0.4))
        for obj in (blade, outline, mid):
            bend = obj.modifiers.new("Bend", "SIMPLE_DEFORM")
            bend.deform_method = "BEND"
            bend.angle = math.radians(25)
            bend.deform_axis = "X"
            c.apply_modifiers(obj)
            obj.scale = (side, 1, 1)  # applying a negative scale also fixes the winding
            obj.rotation_euler = (math.pi / 2, 0, side * 0)
            c.activate(obj)
            bpy.ops.object.transform_apply(scale=True, rotation=True)
            obj.rotation_euler = (0, side * tilt, side * 0.35)
            obj.location = (side * 0.2, 0.02, lift)
            bpy.ops.object.transform_apply(location=True, rotation=True)
        wings.append(blade)
        veins += [outline, mid]
wing_obj = c.join(wings, "wings")
c.set_material(wing_obj, WING)
gold_parts += veins

# Side gems where the wings join.
gems = []
for side in (-1, 1):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, segments=24, ring_count=12, location=(side * 0.22, -0.04, 0.72))
    gems.append(bpy.context.active_object)
side_gems = c.join(gems, "sideGems")
c.smooth(side_gems, 80)
c.set_material(side_gems, HEART)

gold = c.join(gold_parts, "gold")
c.smooth(gold, 50)
c.set_material(gold, GOLD)

c.export(c.output_path())
