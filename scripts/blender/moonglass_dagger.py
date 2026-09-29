"""Moonglass dagger (Blender build). Length along +Z, front toward -Y, metres.

An original design in the project's lunar style: a curved, faceted ice-crystal
blade with a crescent window and a glowing inlay line, a silver crescent-moon
guard with a sapphire, a navy leather-wrapped grip and a faceted star pommel.

Weapons keep fixed authored colours: no ColorID / palette regions.
The editable, pre-bake scene is also saved to art-source/moonglass_dagger.blend.
"""

import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as c  # noqa: E402
import materials as m  # noqa: E402
from jewelry import Jeweler  # noqa: E402

ASSET = "MoonglassDagger"
BLEND_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "art-source", "moonglass_dagger.blend"))

c.reset()
j = Jeweler()

# ---------------------------------------------------------------------------
# Materials (fixed colours)
# ---------------------------------------------------------------------------

metal = j.silver
metal.name = f"MAT_{ASSET}_Weapon_Metal"
gem = j.blue
gem.name = f"MAT_{ASSET}_Weapon_Gem"
for unused in (j.gold, j.ice):
    bpy.data.materials.remove(unused)

glow = c.simple_material(f"MAT_{ASSET}_Weapon_Glow", (0.45, 0.92, 1.0), roughness=0.2,
                         emission=(0.35, 0.85, 1.0), strength=3.2)
moonstone = c.simple_material(f"MAT_{ASSET}_Weapon_Moonstone", (0.78, 0.9, 1.0), roughness=0.1,
                              emission=(0.55, 0.8, 1.0), strength=1.4)
leather = m.leather(f"MAT_{ASSET}_Weapon_Leather", dark=(0.004, 0.007, 0.03), light=(0.018, 0.03, 0.095))


def crystal_build(nt, bsdf, tc):
    """Deep sapphire at the base clearing to pale frost at the tip; brighter edges."""
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["UV"], sep.inputs["Vector"])
    along = c.ramp(nt, sep.outputs["Y"], [
        (0.0, (0.008, 0.035, 0.19)),
        (0.45, (0.025, 0.13, 0.48)),
        (0.8, (0.16, 0.45, 0.85)),
        (1.0, (0.62, 0.85, 1.0)),
    ])
    centred = nt.nodes.new("ShaderNodeMath"); centred.operation = "SUBTRACT"; centred.inputs[1].default_value = 0.5
    nt.links.new(sep.outputs["X"], centred.inputs[0])
    edge = nt.nodes.new("ShaderNodeMath"); edge.operation = "ABSOLUTE"
    nt.links.new(centred.outputs[0], edge.inputs[0])
    frost = c.ramp(nt, edge.outputs[0], [(0.4, (0, 0, 0)), (0.5, (0.85, 0.85, 0.85))])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "SCREEN"
    nt.links.new(frost, mix.inputs["Factor"])
    nt.links.new(along, mix.inputs[6])
    mix.inputs[7].default_value = (0.62, 0.86, 1.0, 1)
    # Faint internal fracture veins keep the large faces from reading as flat plastic.
    veins = c.noise(nt, tc.outputs["Object"], 55, detail=4, distortion=0.8, stretch=(1, 1, 0.25))
    vein_mask = c.ramp(nt, veins, [(0.62, (0, 0, 0)), (0.7, (1, 1, 1))])
    veined = nt.nodes.new("ShaderNodeMix"); veined.data_type = "RGBA"; veined.blend_type = "ADD"
    nt.links.new(vein_mask, veined.inputs["Factor"])
    nt.links.new(mix.outputs[2], veined.inputs[6])
    veined.inputs[7].default_value = (0.14, 0.2, 0.26, 1)
    nt.links.new(veined.outputs[2], bsdf.inputs["Base Color"])
    # A constant glow: the bake pipeline keeps emission as a factor (a linked
    # emission colour would be flattened to its white default and wash the blade out).
    bsdf.inputs["Emission Color"].default_value = (0.05, 0.2, 0.9, 1)
    bsdf.inputs["Emission Strength"].default_value = 0.12
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 0.22


crystal = c.procedural_material(f"MAT_{ASSET}_Weapon_Crystal", crystal_build)

# ---------------------------------------------------------------------------
# Blade: asymmetric crescent sliver with a faceted hexagonal section
# ---------------------------------------------------------------------------

L = 0.27            # blade length above the guard hub
Z0 = -0.006         # blade root sits inside the hub


def centre(t):       # the tip sweeps toward +X, like a waning moon
    return 0.024 * t ** 2.1


def spine_half(t):   # -X side: straighter
    return 0.0155 * (1 - t) ** 0.8 + 0.0007


def edge_half(t):    # +X side: bellied cutting edge
    return (0.0175 + 0.0065 * math.sin(math.pi * min(1.0, t * 1.15))) * (1 - t) ** 0.55 + 0.0007


def half_thick(t):
    return 0.0056 * (1 - t) ** 0.6 + 0.0004


def blade_section(t):
    x, z = centre(t), Z0 + t * L
    wl, wr, th = spine_half(t), edge_half(t), half_thick(t)
    return [(x - wl, 0, z), (x - wl * 0.35, -th, z), (x + wr * 0.35, -th * 0.9, z),
            (x + wr, 0, z), (x + wr * 0.35, th * 0.9, z), (x - wl * 0.35, th, z)]


def blade_uv(x, y, z):
    t = min(1.0, max(0.0, (z - Z0) / L))
    left, right = centre(t) - spine_half(t), centre(t) + edge_half(t)
    return ((x - left) / max(1e-6, right - left), t)


blade = c.loft(f"{ASSET}_Weapon_Blade", [blade_section((i / 56) ** 0.9) for i in range(57)], uv=blade_uv)

# Crescent window through the blade near its root (a real hole, not a decal).
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.0078, depth=0.04,
                                    location=(centre(0.18) - 0.002, 0, Z0 + 0.18 * L), rotation=(math.pi / 2, 0, 0))
moon = bpy.context.object
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.0068, depth=0.05,
                                    location=(centre(0.18) + 0.0022, 0, Z0 + 0.18 * L + 0.0016), rotation=(math.pi / 2, 0, 0))
c.boolean_cut(moon, bpy.context.object)
c.boolean_cut(blade, moon)
c.set_material(blade, crystal)
c.smooth(blade, 28)

# Glowing inlay along the ridge, raised slightly off both faces.
def inlay(side):
    sections = []
    for i in range(33):
        t = 0.24 + 0.58 * i / 32
        x, z = centre(t) + (edge_half(t) - spine_half(t)) * 0.12, Z0 + t * L
        w = 0.0011 * math.sin(math.pi * i / 32) + 0.00015
        y = side * (half_thick(t) * 0.95 + 0.00035)
        d = side * 0.0005
        sections.append([(x - w, y, z), (x + w, y, z), (x + w, y + d, z), (x - w, y + d, z)])
    obj = c.loft(f"{ASSET}_Weapon_Inlay", sections)
    c.set_material(obj, glow)
    return obj

inlays = [inlay(-1), inlay(1)]

# ---------------------------------------------------------------------------
# Guard: flattened crescent moon, horns rising beside the blade
# ---------------------------------------------------------------------------

GC, GR = (0.0, 0.034), 0.05


def arc(a0, a1, n, r=GR, cz=GC[1]):
    return [(r * math.cos(math.radians(a0 + (a1 - a0) * k / (n - 1))), 0,
             cz + r * math.sin(math.radians(a0 + (a1 - a0) * k / (n - 1)))) for k in range(n)]

guard = []   # own metal parts; j.wire/j.bead/j.marquise register theirs already
for a1 in (190, 350):
    half = c.curve_tube(f"{ASSET}_Weapon_Guard", arc(270, a1, 14), 0.0078, taper=(1.0, 0.1), resolution=4)
    half.scale = (1, 0.55, 1)
    guard.append(half)
# Thin filigree echo of the crescent on its inner edge.
j.wire("filigree", arc(222, 318, 16, r=GR * 0.8, cz=GC[1] + 0.004), 0.0021, metal)

bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, radius=0.0125, location=(0, 0, -0.012))
hub = bpy.context.object
hub.scale = (1, 0.62, 0.9)
guard.append(hub)
def set_stone(center, length, width):
    """Faceted navette stone with a bezel and prongs scaled to the stone
    (the shared Jeweler.marquise uses fixed-size settings meant for large crests)."""
    cx, cy, cz = center
    outline = [(math.sin(t) * abs(math.sin(t)) ** .25 * width / 2, math.cos(t) * length / 2)
               for t in [k * math.tau / 12 for k in range(12)]]
    verts = [(cx + x, cy, cz + z) for x, z in outline]
    verts += [(cx + x * .55, cy - width * .3, cz + z * .72) for x, z in outline]
    verts += [(cx, cy - width * .38, cz), (cx, cy + width * .22, cz)]
    faces = []
    for k in range(12):
        n = (k + 1) % 12
        faces += [(k, n, 12 + n), (k, 12 + n, 12 + k), (12 + k, 12 + n, 24), (n, k, 25)]
    j.add(c.mesh_from("cutCrystal", verts, faces), gem)
    j.wire("bezel", [(cx + x * 1.05, cy + width * .05, cz + z * 1.03) for x, z in outline],
           width * .06, metal, closed=True)
    for k in (1, 5, 7, 11):
        x, z = outline[k]
        j.bead((cx + x * 1.02, cy - width * .12, cz + z * 1.02), width * .085, metal)

set_stone((0, -0.0086, -0.012), 0.024, 0.0135)
j.bead((0, 0.0078, -0.012), 0.0042, gem)

# ---------------------------------------------------------------------------
# Grip, ferrules and star pommel
# ---------------------------------------------------------------------------

bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.0086, depth=0.094, location=(0, 0, -0.065))
grip_core = bpy.context.object
grip_core.scale = (1.08, 0.92, 1)
wrap = c.helix_wrap(f"{ASSET}_Weapon_Grip", 0.0091, 0.082, 7, 0.0084, z0=-0.106)
grip = [grip_core, wrap]

for z in (-0.02, -0.109):
    j.wire("ferrule", [(0.0104 * math.cos(a), 0.0096 * math.sin(a), z)
                       for a in [k * math.tau / 24 for k in range(24)]], 0.0023, metal, closed=True)

bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.0052, depth=0.012, location=(0, 0, -0.117))
guard.append(bpy.context.object)

# Faceted four-point star: alternating long/short rays, front and back apexes.
PZ = -0.132
rays = [0.011, 0.0055, 0.019, 0.0055, 0.026, 0.0055, 0.019, 0.0055]   # up, -, right, -, down, -, left, -
outline = [(r * math.sin(k * math.tau / 8), 0, PZ + r * math.cos(k * math.tau / 8)) for k, r in enumerate(rays)]
star_verts = outline + [(0, -0.0085, PZ), (0, 0.0085, PZ)]
star_faces = [(k, (k + 1) % 8, 8) for k in range(8)] + [((k + 1) % 8, k, 9) for k in range(8)]
star = c.mesh_from(f"{ASSET}_Weapon_Pommel", star_verts, star_faces)
guard.append(star)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.0042, location=(0, -0.0078, PZ))
stone = bpy.context.object

# ---------------------------------------------------------------------------
# Assemble: one object per material class, parented to <Asset>_ROOT
# ---------------------------------------------------------------------------

for obj in guard:
    j.add(obj, metal)
j.finish()

objects = {}
for obj in list(bpy.context.scene.objects):
    if obj.type == "MESH" and obj.data.materials:
        objects.setdefault(obj.data.materials[0].name, obj)

metal_obj = objects[metal.name]
metal_obj.name = f"{ASSET}_Weapon_Metal"
gem_obj = objects[gem.name]
gem_obj.name = f"{ASSET}_Weapon_Gem"

grip_obj = c.join(grip, f"{ASSET}_Weapon_Grip")
c.set_material(grip_obj, leather)
c.smooth(grip_obj, 60)

stone.name = f"{ASSET}_Weapon_Moonstone"
c.set_material(stone, moonstone)
c.smooth(stone, 180)

inlay_obj = c.join(inlays, f"{ASSET}_Weapon_Inlay")
c.set_material(inlay_obj, glow)

root = bpy.data.objects.new(f"{ASSET}_ROOT", None)
bpy.context.collection.objects.link(root)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
for obj in meshes:
    c.activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.parent = root

# Weapons are fixed-colour: make sure no palette data slipped in.
assert not any(a.name == "ColorID" for o in meshes for a in o.data.attributes), "weapon must not carry ColorID"

for mat in list(bpy.data.materials):
    if mat.users == 0:
        bpy.data.materials.remove(mat)

tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
zs = [(o.matrix_world @ v.co).z for o in meshes for v in o.data.vertices]
print(f"ASSET {ASSET}: {[o.name for o in meshes]}, {tris} tris, length {max(zs) - min(zs):.3f} m")

os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0   # no .blend1 backup next to the source
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH, compress=True)
print(f"SAVED {BLEND_PATH}")

c.export(c.output_path(), objects=meshes)
