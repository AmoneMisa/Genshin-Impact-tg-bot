"""Sun-guard longsword (Blender build). Length along +Z, front toward -Y."""

import math
import os
import sys

import bpy
import bmesh

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402

c.reset()

# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------

def steel(nt, bsdf, tc):
    obj = tc.outputs["Object"]
    brushed = c.noise(nt, obj, 30, detail=8, stretch=(1, 1, 0.04))
    temper = c.noise(nt, obj, 2.2, detail=4)
    lines = c.scratches(nt, obj, scale=18, stretch=(1, 1, 0.08))
    base = c.ramp(nt, brushed, [(0.25, (0.38, 0.39, 0.4)), (0.75, (0.74, 0.73, 0.7))])
    mottle = c.ramp(nt, temper, [(0.55, (1, 1, 1)), (0.8, (0.86, 0.62, 0.52))])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1
    nt.links.new(base, mix.inputs[6])
    nt.links.new(mottle, mix.inputs[7])
    # Copper-stained fullers: the loft's UVs put the grooves at u = 0.5 ± 0.155.
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["UV"], sep.inputs["Vector"])
    centred = nt.nodes.new("ShaderNodeMath"); centred.operation = "SUBTRACT"; centred.inputs[1].default_value = 0.5
    nt.links.new(sep.outputs["X"], centred.inputs[0])
    side = nt.nodes.new("ShaderNodeMath"); side.operation = "ABSOLUTE"
    nt.links.new(centred.outputs[0], side.inputs[0])
    off = nt.nodes.new("ShaderNodeMath"); off.operation = "SUBTRACT"; off.inputs[1].default_value = 0.155
    nt.links.new(side.outputs[0], off.inputs[0])
    dist = nt.nodes.new("ShaderNodeMath"); dist.operation = "ABSOLUTE"
    nt.links.new(off.outputs[0], dist.inputs[0])
    groove = nt.nodes.new("ShaderNodeMapRange")
    groove.inputs["From Min"].default_value = 0.0
    groove.inputs["From Max"].default_value = 0.045
    groove.inputs["To Min"].default_value = 1.0
    groove.inputs["To Max"].default_value = 0.0
    nt.links.new(dist.outputs[0], groove.inputs["Value"])
    stain = nt.nodes.new("ShaderNodeMix")
    stain.data_type = "RGBA"
    nt.links.new(groove.outputs["Result"], stain.inputs["Factor"])
    nt.links.new(mix.outputs[2], stain.inputs[6])
    copper = c.ramp(nt, temper, [(0.3, (0.42, 0.16, 0.08)), (0.8, (0.62, 0.3, 0.16))])
    nt.links.new(copper, stain.inputs[7])
    nt.links.new(stain.outputs[2], bsdf.inputs["Base Color"])
    rough_mix = nt.nodes.new("ShaderNodeMath"); rough_mix.operation = "MAXIMUM"
    rough = c.ramp(nt, lines, [(0.0, (0.5, 0.5, 0.5)), (0.04, (0.18, 0.18, 0.18))])
    # Grooves are rougher (stained), flats stay polished.
    groove_rough = nt.nodes.new("ShaderNodeMath"); groove_rough.operation = "MULTIPLY"; groove_rough.inputs[1].default_value = 0.55
    nt.links.new(groove.outputs["Result"], groove_rough.inputs[0])
    rough_bw = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(rough, rough_bw.inputs["Color"])
    nt.links.new(rough_bw.outputs["Val"], rough_mix.inputs[0])
    nt.links.new(groove_rough.outputs[0], rough_mix.inputs[1])
    nt.links.new(rough_mix.outputs[0], bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = 1
    c.bump(nt, bsdf, lines, strength=0.15, distance=0.004)


def brass(nt, bsdf, tc):
    obj = tc.outputs["Object"]
    wear = c.noise(nt, obj, 9, detail=6)
    color = c.ramp(nt, wear, [(0.35, (0.36, 0.24, 0.1)), (0.55, (0.86, 0.64, 0.3)), (0.8, (0.98, 0.82, 0.48))])
    nt.links.new(color, bsdf.inputs["Base Color"])
    rough = c.ramp(nt, wear, [(0.35, (0.55, 0.55, 0.55)), (0.7, (0.18, 0.18, 0.18))])
    nt.links.new(rough, bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = 1
    fine = c.noise(nt, obj, 60, detail=3)
    c.bump(nt, bsdf, fine, strength=0.12, distance=0.003)


def leather(nt, bsdf, tc):
    obj = tc.outputs["Object"]
    grain = c.noise(nt, obj, 80, detail=8)
    color = c.ramp(nt, grain, [(0.35, (0.12, 0.06, 0.035)), (0.7, (0.3, 0.17, 0.1))])
    nt.links.new(color, bsdf.inputs["Base Color"])
    rough = c.ramp(nt, grain, [(0.3, (0.8, 0.8, 0.8)), (0.7, (0.55, 0.55, 0.55))])
    nt.links.new(rough, bsdf.inputs["Roughness"])
    bsdf.inputs["Metallic"].default_value = 0
    c.bump(nt, bsdf, grain, strength=0.35, distance=0.004)


steel_mat = c.procedural_material("sunSteel", steel)
brass_mat = c.procedural_material("sunBrass", brass)
leather_mat = c.procedural_material("gripLeather", leather)
core_mat = c.simple_material("sunCore", (1.0, 0.95, 0.8), roughness=0.2, emission=(1.0, 0.72, 0.36), strength=6)
dark_mat = c.simple_material("gripCore", (0.05, 0.04, 0.035), roughness=0.8)

# ---------------------------------------------------------------------------
# Blade: twin-fullered cross-section lofted along Z
# ---------------------------------------------------------------------------

L, W, TH = 3.1, 0.2, 0.05


def taper(t, start=0.86):
    return 1 - 0.1 * (t / start) if t < start else 0.9 * max(0.0, 1 - (t - start) / (1 - start)) ** 0.75


def section(t):
    w = W * taper(t)
    th = TH * (1 - t * 0.45)
    g, gh = w * 0.32, w * 0.1
    d = th * 0.55 * min(1.0, max(0.0, (0.86 - t) / 0.26))
    front = [(w, 0), (w * 0.64, -th), (g + gh, -th), (g, -th + d), (g - gh, -th),
             (-(g - gh), -th), (-g, -th + d), (-(g + gh), -th), (-w * 0.64, -th), (-w, 0)]
    back = [(x, -y) for x, y in front[1:-1][::-1]]
    z = t * L
    return [(x, y, z) for x, y in front + back]


# UVs: u across the blade (front and back share it), v along the length.
blade = c.loft("blade", [section(i / 96) for i in range(97)], uv=lambda x, y, z: (x / (2 * W) + 0.5, z / L))
blade["bake_size"] = (256, 1024)
# No bevel on the blade: on a razor-thin edge the bevel folds over itself and
# notches the silhouette. Smooth-by-angle keeps the facets crisp instead.
c.smooth(blade, 30)
c.set_material(blade, steel_mat)

# ---------------------------------------------------------------------------
# Guard: sun ring, sunburst rays, blazing core, side curls, collar
# ---------------------------------------------------------------------------

gold_parts = []
for major, minor in ((0.42, 0.055), (0.31, 0.02)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=96, minor_segments=18,
                                     location=(0, 0, -0.02), rotation=(math.pi / 2, 0, 0))
    gold_parts.append(bpy.context.active_object)

rays_mesh = bpy.data.meshes.new("rays")
bm = bmesh.new()
verts = []
for k in range(24):
    a = k / 24 * math.tau
    r = 0.14 if k % 2 else 0.27
    verts.append(bm.verts.new((math.cos(a) * r, 0, math.sin(a) * r - 0.02)))
bm.faces.new(verts)
bm.to_mesh(rays_mesh)
bm.free()
rays = bpy.data.objects.new("rays", rays_mesh)
bpy.context.collection.objects.link(rays)
solid = rays.modifiers.new("Solid", "SOLIDIFY")
solid.thickness = 0.035
solid.offset = 0
c.add_bevel(rays, width=0.008, segments=2, angle=30)
c.apply_modifiers(rays)
gold_parts.append(rays)

for side in (-1, 1):
    curl = c.curve_tube("curl", [(side * 0.3, 0, 0.2), (side * 0.44, 0, 0.3), (side * 0.53, 0, 0.26), (side * 0.56, 0, 0.14), (side * 0.5, 0, 0.1)], 0.032, taper=(1.0, 0.45))
    gold_parts.append(curl)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, location=(side * 0.5, 0, 0.1), segments=24, ring_count=12)
    gold_parts.append(bpy.context.active_object)

bpy.ops.mesh.primitive_cylinder_add(radius=0.085, depth=0.12, location=(0, 0, -0.42), vertices=40)
collar = bpy.context.active_object
c.add_bevel(collar, width=0.02, segments=3)
c.apply_modifiers(collar)
gold_parts.append(collar)

# Pommel: faceted-then-subdivided teardrop with a ring.
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(0, 0, -1.55), segments=32, ring_count=16)
pommel = bpy.context.active_object
pommel.scale = (1, 1, 1.25)
bpy.ops.mesh.primitive_torus_add(major_radius=0.095, minor_radius=0.018, location=(0, 0, -1.43), major_segments=48, minor_segments=10)
gold_parts += [pommel, bpy.context.active_object]

guard = c.join(gold_parts, "guard")
c.smooth(guard, 40)
c.set_material(guard, brass_mat)

bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=(0, 0, -0.02), segments=40, ring_count=20)
core = bpy.context.active_object
core.name = "sunCore"
core.scale = (1, 0.7, 1)
bpy.ops.object.shade_smooth()
c.set_material(core, core_mat)

# ---------------------------------------------------------------------------
# Grip: dark core wound with a real leather strip
# ---------------------------------------------------------------------------

bpy.ops.mesh.primitive_cylinder_add(radius=0.052, depth=0.92, location=(0, 0, -0.93), vertices=32)
grip_core = bpy.context.active_object
grip_core.name = "gripCore"
c.set_material(grip_core, dark_mat)
wrap = c.helix_wrap("gripWrap", radius=0.058, height=0.86, turns=9, strip=0.07, z0=-1.36)
c.smooth(wrap, 60)
c.set_material(wrap, leather_mat)

c.export(c.output_path())
