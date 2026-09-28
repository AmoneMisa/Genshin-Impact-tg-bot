"""Shared helpers for headless Blender model scripts.

Conventions: Blender is Z-up. Build items with their length along +Z and their
front facing -Y; the glTF exporter converts that to the game's Y-up, +Z-front.

Run a model script with:
    blender --background --factory-startup --python scripts/blender/<model>.py -- <out.glb>

Everything is procedural: geometry is built from primitives, curves and
modifiers; materials are Principled BSDF node trees. glTF can only carry image
textures, so procedural materials are baked to images with Cycles before export.
"""

import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

TEXTURE_SIZE = int(os.environ.get("MODEL_TEXTURE_SIZE", "512"))
BAKE_SAMPLES = int(os.environ.get("MODEL_BAKE_SAMPLES", "12"))


# ---------------------------------------------------------------------------
# Scene
# ---------------------------------------------------------------------------

def output_path():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        raise SystemExit("usage: blender --background --python <script> -- <out.glb>")
    return os.path.abspath(argv[0])


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = BAKE_SAMPLES
    return scene


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifiers(obj):
    activate(obj)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def join(objects, name):
    activate(objects[0])
    for obj in objects:
        obj.select_set(True)
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    return obj


def set_material(obj, mat):
    """Make `mat` the only material and assign every face to it.

    Boolean cuts and joins leave extra (often empty) slots behind, and faces can
    end up pointing at an empty one, which exports as an untextured default.
    """
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.material_index = 0
    return obj


def smooth(obj, angle=35):
    """Smooth shading with sharp edges kept above `angle` degrees."""
    activate(obj)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    return obj


# ---------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------

def mesh_from(name, verts, faces, edges=()):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], list(edges), faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def loft(name, sections, closed=True, uv=None):
    """Skin a list of cross-section loops (same vertex count) into a closed tube with caps.

    With `uv(x, y, z) -> (u, v)` the side faces get exact UVs and the object is
    flagged so baking keeps them instead of auto-unwrapping (long thin shapes like
    blades otherwise get cut into strips and waste most of the texture).
    """
    n = len(sections[0])
    verts = [v for ring in sections for v in ring]
    faces = []
    for s in range(len(sections) - 1):
        for k in range(n if closed else n - 1):
            a, b = s * n + k, s * n + (k + 1) % n
            faces.append((a, b, b + n, a + n))
    faces.append(tuple(range(n))[::-1])
    last = (len(sections) - 1) * n
    faces.append(tuple(range(last, last + n)))
    obj = mesh_from(name, verts, faces)
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=1e-5)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    if uv:
        layer = obj.data.uv_layers.new(name="UVMap")
        for poly in obj.data.polygons:
            for li in poly.loop_indices:
                co = obj.data.vertices[obj.data.loops[li].vertex_index].co
                layer.data[li].uv = uv(co.x, co.y, co.z)
        obj["uv_ready"] = True
    return obj


def surface_grid(name, point, seg_u, seg_v, closed_u=False):
    """Quad grid from `point(u, v) -> (x, y, z)`, u, v in [0, 1]; optionally closed around u.

    Gets exact (u, v) UVs and is flagged so baking keeps them.
    """
    cols = seg_u if closed_u else seg_u + 1
    verts = [point(i / seg_u, j / seg_v) for j in range(seg_v + 1) for i in range(cols)]
    faces = []
    for j in range(seg_v):
        for i in range(seg_u):
            a = j * cols + i
            b = j * cols + (i + 1) % cols if closed_u else a + 1
            faces.append((a, b, b + cols, a + cols))
    obj = mesh_from(name, verts, faces)
    layer = obj.data.uv_layers.new(name="UVMap")
    for poly in obj.data.polygons:
        for li in poly.loop_indices:
            vi = obj.data.loops[li].vertex_index
            i, j = vi % cols, vi // cols
            u = i / seg_u
            # Faces that wrap around the seam need u = 1, not 0.
            if closed_u and i == 0 and any(obj.data.loops[k].vertex_index % cols == cols - 1 for k in poly.loop_indices):
                u = 1.0
            layer.data[li].uv = (u, j / seg_v)
    obj["uv_ready"] = True
    return obj


def curve_tube(name, points, radius, taper=None, resolution=6, closed=False, bevel_resolution=2):
    """A bevelled curve through `points` converted to mesh; `taper` = (start, end) radius factors."""
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    # Thin trim reads round with a coarse bevel; fine settings cost thousands of triangles.
    data.bevel_resolution = bevel_resolution
    # Densely sampled curves (rims, loops) already have enough points: subdividing
    # every span again multiplies triangles for no visible gain.
    data.resolution_u = max(1, min(resolution, 96 // max(1, len(points))))
    data.use_fill_caps = True
    spline = data.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*co, 1)
    spline.use_endpoint_u = True
    spline.use_cyclic_u = closed
    spline.order_u = min(4, len(points))
    if taper:
        for i, p in enumerate(spline.points):
            t = i / max(1, len(points) - 1)
            p.radius = taper[0] + (taper[1] - taper[0]) * t
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    activate(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.active_object


def flat_curve(name, points, width, thickness, taper=(1.0, 0.35), resolution=6):
    """Tapered blade-like curve: an elliptical profile `width` across (Y) and
    `thickness` deep in the curve's plane. For bow limbs, prods and ribbons."""
    profile_data = bpy.data.curves.new(name + "Profile", "CURVE")
    spline = profile_data.splines.new("NURBS")
    n = 16
    spline.points.add(n - 1)
    for k, p in enumerate(spline.points):
        a = k / n * math.tau
        p.co = (math.cos(a) * thickness, math.sin(a) * width, 0, 1)
    spline.use_cyclic_u = True
    profile_data.resolution_u = 1  # 16 profile points are plenty; the default subdivides each span ~12x
    profile = bpy.data.objects.new(name + "Profile", profile_data)
    bpy.context.collection.objects.link(profile)
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_mode = "OBJECT"
    data.bevel_object = profile
    data.use_fill_caps = True
    data.resolution_u = max(1, min(resolution, 96 // max(1, len(points))))
    path = data.splines.new("NURBS")
    path.points.add(len(points) - 1)
    for i, (p, co) in enumerate(zip(path.points, points)):
        t = i / max(1, len(points) - 1)
        p.co = (*co, 1)
        p.radius = taper[0] + (taper[1] - taper[0]) * t
    path.use_endpoint_u = True
    path.order_u = min(4, len(points))
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    activate(obj)
    bpy.ops.object.convert(target="MESH")
    result = bpy.context.active_object
    bpy.data.objects.remove(profile, do_unlink=True)
    return result


def helix_wrap(name, radius, height, turns, strip, z0=0.0):
    """Leather strip wound around a cylinder along Z (a real 3D grip wrap)."""
    pts = []
    steps = int(turns * 24)
    for i in range(steps + 1):
        t = i / steps
        a = t * turns * math.tau
        pts.append((math.cos(a) * radius, math.sin(a) * radius, z0 + t * height))
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 4
    spline = data.splines.new("POLY")
    spline.points.add(len(pts) - 1)
    for p, co in zip(spline.points, pts):
        p.co = (*co, 1)
    # Flat ribbon profile.
    data.extrude = strip * 0.5
    data.bevel_depth = strip * 0.12
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    activate(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.active_object


def add_bevel(obj, width=0.01, segments=3, angle=40):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(angle)
    mod.harden_normals = True
    return mod


def add_subsurf(obj, levels=2):
    mod = obj.modifiers.new("Subsurf", "SUBSURF")
    mod.levels = levels
    mod.render_levels = levels
    return mod


def boolean_cut(target, cutter):
    mod = target.modifiers.new("Cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    apply_modifiers(target)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return target


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------

def _nodes(mat):
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return nt, bsdf


def simple_material(name, color, metallic=0.0, roughness=0.5, emission=None, strength=1.0, alpha=1.0):
    """Solid PBR material exported as factors (no bake needed)."""
    mat = bpy.data.materials.new(name)
    nt, bsdf = _nodes(mat)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.surface_render_method = "BLENDED"
    mat["baked"] = False
    return mat


def procedural_material(name, build):
    """`build(nt, bsdf, tex_coord)` wires a procedural node tree; the material is baked later."""
    mat = bpy.data.materials.new(name)
    nt, bsdf = _nodes(mat)
    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    build(nt, bsdf, tex_coord)
    mat["baked"] = True
    return mat


def ramp(nt, source, stops):
    """Color ramp from a float socket; stops = [(position, (r, g, b)), ...]."""
    node = nt.nodes.new("ShaderNodeValToRGB")
    elements = node.color_ramp.elements
    while len(elements) > len(stops):
        elements.remove(elements[-1])
    while len(elements) < len(stops):
        elements.new(0.5)
    for el, (pos, rgb) in zip(elements, stops):
        el.position = pos
        el.color = (*rgb, 1)
    nt.links.new(source, node.inputs["Fac"])
    return node.outputs["Color"]


def noise(nt, vector, scale, detail=6, distortion=0.0, stretch=(1, 1, 1)):
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = stretch
    nt.links.new(vector, mapping.inputs["Vector"])
    node = nt.nodes.new("ShaderNodeTexNoise")
    node.inputs["Scale"].default_value = scale
    node.inputs["Detail"].default_value = detail
    node.inputs["Distortion"].default_value = distortion
    nt.links.new(mapping.outputs["Vector"], node.inputs["Vector"])
    return node.outputs["Fac"]


def scratches(nt, vector, scale=40, stretch=(1, 30, 1)):
    """Thin line pattern from stretched Voronoi edges — reads as fine scratches."""
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = stretch
    nt.links.new(vector, mapping.inputs["Vector"])
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = scale
    nt.links.new(mapping.outputs["Vector"], vor.inputs["Vector"])
    return vor.outputs["Distance"]


def bump(nt, bsdf, height, strength=0.3, distance=0.02):
    node = nt.nodes.new("ShaderNodeBump")
    node.inputs["Strength"].default_value = strength
    node.inputs["Distance"].default_value = distance
    nt.links.new(height, node.inputs["Height"])
    nt.links.new(node.outputs["Normal"], bsdf.inputs["Normal"])


# ---------------------------------------------------------------------------
# Baking
# ---------------------------------------------------------------------------

def unwrap(obj, margin=0.02):
    if obj.get("uv_ready") and obj.data.uv_layers:
        return
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=margin)
    bpy.ops.object.mode_set(mode="OBJECT")


def _bake_pass(obj, nt, bsdf, image, bake_type, pass_filter=None, emit_from=None):
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = image
    nt.nodes.active = node
    activate(obj)
    if emit_from is not None:
        # Route a single channel through Emission to bake it exactly.
        out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
        emission = nt.nodes.new("ShaderNodeEmission")
        nt.links.new(emit_from, emission.inputs["Color"])
        original = out.inputs["Surface"].links[0].from_socket
        nt.links.new(emission.outputs["Emission"], out.inputs["Surface"])
        bpy.ops.object.bake(type="EMIT", margin=8)
        nt.links.new(original, out.inputs["Surface"])
        nt.nodes.remove(emission)
    else:
        kwargs = {"type": bake_type, "margin": 8}
        if pass_filter:
            kwargs["pass_filter"] = pass_filter
        bpy.ops.object.bake(**kwargs)
    nt.nodes.remove(node)


def _input_source(nt, bsdf, name):
    links = bsdf.inputs[name].links
    return links[0].from_socket if links else None


def bake_object(obj, size=None):
    """Bake every procedural material on `obj` into image textures and rewire it for glTF.

    `obj["bake_size"] = (w, h)` overrides the square default (tall maps for blades).
    """
    width, height = obj.get("bake_size", (size or TEXTURE_SIZE, size or TEXTURE_SIZE))
    mats = [slot.material for slot in obj.material_slots if slot.material and slot.material.get("baked")]
    if not mats:
        return
    unwrap(obj)
    for mat in mats:
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
        images = {}
        for key, srgb in (("color", True), ("rough", False), ("metal", False), ("normal", False)):
            img = bpy.data.images.new(f"{mat.name}_{key}", int(width), int(height), alpha=False, float_buffer=False)
            img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
            images[key] = img
        color_src = _input_source(nt, bsdf, "Base Color")
        rough_src = _input_source(nt, bsdf, "Roughness")
        metal_src = _input_source(nt, bsdf, "Metallic")
        _bake_pass(obj, nt, bsdf, images["color"], "EMIT", emit_from=color_src or _const(nt, bsdf.inputs["Base Color"].default_value))
        _bake_pass(obj, nt, bsdf, images["rough"], "EMIT", emit_from=rough_src or _const(nt, [bsdf.inputs["Roughness"].default_value] * 3 + [1]))
        _bake_pass(obj, nt, bsdf, images["metal"], "EMIT", emit_from=metal_src or _const(nt, [bsdf.inputs["Metallic"].default_value] * 3 + [1]))
        _bake_pass(obj, nt, bsdf, images["normal"], "NORMAL")
        _rewire_baked(mat, bsdf, images)
    return obj


def _const(nt, rgba):
    node = nt.nodes.new("ShaderNodeRGB")
    node.outputs[0].default_value = tuple(rgba)
    return node.outputs[0]


def _rewire_baked(mat, bsdf, images):
    nt = mat.node_tree
    keep = {bsdf, next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")}
    emission = (tuple(bsdf.inputs["Emission Color"].default_value), bsdf.inputs["Emission Strength"].default_value)
    for n in list(nt.nodes):
        if n not in keep:
            nt.nodes.remove(n)
    def tex(img):
        node = nt.nodes.new("ShaderNodeTexImage")
        node.image = img
        return node
    nt.links.new(tex(images["color"]).outputs["Color"], bsdf.inputs["Base Color"])
    # glTF packs roughness (G) and metallic (B); the exporter does it from these links.
    sep_r = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex(images["rough"]).outputs["Color"], sep_r.inputs["Color"])
    nt.links.new(sep_r.outputs["Red"], bsdf.inputs["Roughness"])
    sep_m = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex(images["metal"]).outputs["Color"], sep_m.inputs["Color"])
    nt.links.new(sep_m.outputs["Red"], bsdf.inputs["Metallic"])
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(tex(images["normal"]).outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Emission Color"].default_value = emission[0]
    bsdf.inputs["Emission Strength"].default_value = emission[1]


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def export(path, objects=None, draco=True):
    """Bake procedural materials, then write a Draco-compressed, Y-up .glb."""
    objects = objects or [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for obj in objects:
        print(f"OBJECT {obj.name}: {len(obj.data.polygons)} faces, materials={[s.material.name if s.material else None for s in obj.material_slots]}")
    for obj in objects:
        bake_object(obj)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_draco_mesh_compression_enable=draco,
        export_draco_mesh_compression_level=6,
        export_image_format="JPEG",
        export_jpeg_quality=88,
    )
    print(f"EXPORTED {path}")
