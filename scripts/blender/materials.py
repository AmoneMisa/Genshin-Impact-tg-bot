"""Reusable procedural materials (baked to textures on export by common.export)."""

import common as c


def _mix(nt, a, b, factor=None, blend="MIX"):
    node = nt.nodes.new("ShaderNodeMix")
    node.data_type = "RGBA"
    node.blend_type = blend
    if factor is None:
        node.inputs["Factor"].default_value = 1
    else:
        nt.links.new(factor, node.inputs["Factor"])
    nt.links.new(a, node.inputs[6])
    nt.links.new(b, node.inputs[7])
    return node.outputs[2]


def edge_wear(nt, low=0.56, high=0.64):
    """0..1 mask of convex edges from Cycles pointiness — where paint and blacking rub off."""
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = low
    mr.inputs["From Max"].default_value = high
    nt.links.new(geo.outputs["Pointiness"], mr.inputs["Value"])
    return mr.outputs["Result"]


def black_steel(name="blackSteel"):
    """Blackened plate with scratches and bright steel showing through on worn edges."""
    def build(nt, bsdf, tc):
        obj = tc.outputs["Object"]
        mottle = c.noise(nt, obj, 6, detail=6)
        lines = c.scratches(nt, obj, scale=14, stretch=(1, 1, 0.3))
        base = c.ramp(nt, mottle, [(0.3, (0.05, 0.05, 0.06)), (0.7, (0.12, 0.12, 0.14))])
        wear = edge_wear(nt)
        bright = c.ramp(nt, mottle, [(0.3, (0.45, 0.46, 0.48)), (0.7, (0.62, 0.62, 0.63))])
        color = _mix(nt, base, bright, wear)
        nt.links.new(color, bsdf.inputs["Base Color"])
        rough = c.ramp(nt, lines, [(0.0, (0.55, 0.55, 0.55)), (0.05, (0.3, 0.3, 0.3))])
        nt.links.new(rough, bsdf.inputs["Roughness"])
        bsdf.inputs["Metallic"].default_value = 1
        c.bump(nt, bsdf, lines, strength=0.12, distance=0.004)
    return c.procedural_material(name, build)


def brass(name="brass"):
    def build(nt, bsdf, tc):
        obj = tc.outputs["Object"]
        wear = c.noise(nt, obj, 9, detail=6)
        color = c.ramp(nt, wear, [(0.35, (0.36, 0.24, 0.1)), (0.55, (0.86, 0.64, 0.3)), (0.8, (0.98, 0.82, 0.48))])
        polish = edge_wear(nt, 0.6, 0.7)
        shine = c.ramp(nt, wear, [(0.0, (1.0, 0.86, 0.55)), (1.0, (1.0, 0.9, 0.62))])
        nt.links.new(_mix(nt, color, shine, polish), bsdf.inputs["Base Color"])
        rough = c.ramp(nt, wear, [(0.35, (0.55, 0.55, 0.55)), (0.7, (0.18, 0.18, 0.18))])
        nt.links.new(rough, bsdf.inputs["Roughness"])
        bsdf.inputs["Metallic"].default_value = 1
        c.bump(nt, bsdf, c.noise(nt, obj, 60, detail=3), strength=0.12, distance=0.003)
    return c.procedural_material(name, build)


def leather(name="leather", dark=(0.12, 0.06, 0.035), light=(0.3, 0.17, 0.1)):
    def build(nt, bsdf, tc):
        grain = c.noise(nt, tc.outputs["Object"], 80, detail=8)
        nt.links.new(c.ramp(nt, grain, [(0.35, dark), (0.7, light)]), bsdf.inputs["Base Color"])
        nt.links.new(c.ramp(nt, grain, [(0.3, (0.8, 0.8, 0.8)), (0.7, (0.55, 0.55, 0.55))]), bsdf.inputs["Roughness"])
        bsdf.inputs["Metallic"].default_value = 0
        c.bump(nt, bsdf, grain, strength=0.35, distance=0.004)
    return c.procedural_material(name, build)


def void(name="void"):
    """Near-black, fully rough: the inside of cut holes and visor slits."""
    return c.simple_material(name, (0.01, 0.01, 0.012), roughness=1.0)


def gem(name, color, strength=3.0):
    return c.simple_material(name, color, roughness=0.08, emission=color, strength=strength)
