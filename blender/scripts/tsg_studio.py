# tsg_studio.py -- TSG_studio collection: HDRI world, soft-edged emissive softboxes/strips, cameras.
# Never exported (the glTF export only takes the TSG collection).
import json
import math
import os
import bpy
from mathutils import Vector, Matrix

import tsg_spec as S

CAMERAS_JSON = os.path.join(S.ROOT, "config", "cameras.json")


def studio_coll():
    c = bpy.data.collections.get("TSG_studio")
    if c is None:
        c = bpy.data.collections.new("TSG_studio")
        bpy.context.scene.collection.children.link(c)
    return c


def clear_studio(keep=("cam_preview",)):
    c = studio_coll()
    for ob in list(c.objects):
        if ob.name in keep:
            continue
        data = ob.data
        bpy.data.objects.remove(ob, do_unlink=True)
        if data is not None and data.users == 0:
            if isinstance(data, bpy.types.Mesh):
                bpy.data.meshes.remove(data)
            elif isinstance(data, bpy.types.Camera):
                bpy.data.cameras.remove(data)
            elif isinstance(data, bpy.types.Light):
                bpy.data.lights.remove(data)


# ----------------------------------------------------------------------------- world
def setup_world(strength=0.25, rot_deg=0.0, tint=(1.0, 1.0, 1.0)):
    scene = bpy.context.scene
    w = scene.world
    if w is None:
        w = bpy.data.worlds.new("World")
        scene.world = w
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    img = bpy.data.images.load(S.HDRI, check_existing=True)
    env.image = img
    mp = nt.nodes.new("ShaderNodeMapping")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(rot_deg))
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs["Factor"].default_value = 1.0
    for s in mix.inputs:
        if s.identifier == "B_Color":
            s.default_value = (*tint, 1.0)
    nt.links.new(env.outputs["Color"], [s for s in mix.inputs if s.identifier == "A_Color"][0])
    nt.links.new([s for s in mix.outputs if s.identifier == "Result_Color"][0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    return w


# ----------------------------------------------------------------------------- softboxes
def _emit_material(name, strength, color, edge=0.35, gradient=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1.0)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["UV"], sep.inputs["Vector"])

    def edge_fall(sock):
        # 1 in the middle, smooth falloff to 0 at the border (|2u-1| from 1-edge .. 1)
        a = nt.nodes.new("ShaderNodeMath")
        a.operation = 'MULTIPLY_ADD'
        a.inputs[1].default_value = 2.0
        a.inputs[2].default_value = -1.0
        nt.links.new(sock, a.inputs[0])
        ab = nt.nodes.new("ShaderNodeMath")
        ab.operation = 'ABSOLUTE'
        nt.links.new(a.outputs[0], ab.inputs[0])
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.interpolation_type = 'SMOOTHSTEP'
        mr.inputs["From Min"].default_value = 1.0 - edge
        mr.inputs["From Max"].default_value = 1.0
        mr.inputs["To Min"].default_value = 1.0
        mr.inputs["To Max"].default_value = 0.0
        nt.links.new(ab.outputs[0], mr.inputs["Value"])
        return mr.outputs["Result"]

    fx = edge_fall(sep.outputs["X"])
    fy = edge_fall(sep.outputs["Y"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = 'MULTIPLY'
    nt.links.new(fx, mul.inputs[0])
    nt.links.new(fy, mul.inputs[1])
    val = mul.outputs[0]
    if gradient:
        # brighter toward +V (one end of the strip)
        gm = nt.nodes.new("ShaderNodeMath")
        gm.operation = 'MULTIPLY_ADD'
        gm.inputs[1].default_value = gradient
        gm.inputs[2].default_value = 1.0 - gradient
        nt.links.new(sep.outputs["Y"], gm.inputs[0])
        m2 = nt.nodes.new("ShaderNodeMath")
        m2.operation = 'MULTIPLY'
        nt.links.new(val, m2.inputs[0])
        nt.links.new(gm.outputs[0], m2.inputs[1])
        val = m2.outputs[0]
    sm = nt.nodes.new("ShaderNodeMath")
    sm.operation = 'MULTIPLY'
    sm.inputs[1].default_value = strength
    nt.links.new(val, sm.inputs[0])
    nt.links.new(sm.outputs[0], em.inputs["Strength"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m


def look_at_matrix(loc, target, up=(0, 0, 1)):
    loc = Vector(loc)
    fwd = (Vector(target) - loc).normalized()
    upv = Vector(up)
    if abs(fwd.dot(upv.normalized())) > 0.995:
        upv = Vector((0, 1, 0)) if abs(fwd.y) < 0.9 else Vector((1, 0, 0))
    right = fwd.cross(upv).normalized()
    tu = right.cross(fwd).normalized()
    m = Matrix((right, tu, -fwd)).transposed().to_4x4()
    m.translation = loc
    return m


def softbox(name, w, h, loc, target, strength, color=(1.0, 0.985, 0.96), edge=0.35, gradient=0.0, up=(0, 0, 1)):
    """Plane facing `target` (its +Z normal points at the target). Invisible to camera rays."""
    coll = studio_coll()
    me = bpy.data.meshes.new(name)
    hw, hh = w / 2, h / 2
    me.from_pydata([(-hw, -hh, 0), (hw, -hh, 0), (hw, hh, 0), (-hw, hh, 0)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name="UVMap")
    for loop, co in zip(me.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[loop.index].uv = co
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    ob.matrix_world = look_at_matrix(loc, target, up) @ Matrix.Rotation(math.pi, 4, 'X')
    me.materials.append(_emit_material("mat_" + name, strength, color, edge, gradient))
    ob.visible_camera = False
    ob.visible_shadow = False
    return ob


# ----------------------------------------------------------------------------- cameras
def load_cameras():
    with open(CAMERAS_JSON, encoding="utf-8") as f:
        return json.load(f)


def camera(name, position, target, fov_v_deg, up=(0, 1, 0), shift_k=0.0, res=(1600, 1000), lens_mm=None):
    """cameras.json semantics: fovV vertical FOV; shiftK = horizontal subject shift in multiples of the
    visible height. Blender shift is a fraction of the larger frame dimension -> shift_x = -shiftK*H/max(W,H)
    (camera shift right moves the subject left)."""
    coll = studio_coll()
    cd = bpy.data.cameras.new(name)
    ob = bpy.data.objects.new(name, cd)
    coll.objects.link(ob)
    cd.sensor_fit = 'VERTICAL'
    cd.sensor_height = 24.0
    if lens_mm:
        cd.lens = lens_mm
    else:
        cd.angle_y = math.radians(fov_v_deg)
    cd.clip_start = 1.0
    cd.clip_end = 5000.0
    W, H = res
    cd.shift_x = -shift_k * H / max(W, H)
    ob.matrix_world = look_at_matrix(position, target, up)
    return ob


def hero_camera(res=(1600, 1000), key="hero_desktop_en", shift_override=0.0):
    cams = load_cameras()
    c = cams[key]
    return camera("cam_hero", c["position"], c["target"], c["fovV"], up=(0, 1, 0),
                  shift_k=c["shiftK"] if shift_override is None else shift_override, res=res)


# ----------------------------------------------------------------------------- lighting rigs
def rig(spec, target=(0, 0, -2), scale=1.0):
    """spec: list of dicts(name, w, h, dir, dist, strength, up, edge, gradient)."""
    T = Vector(target)
    out = []
    for s_ in spec:
        d = Vector(s_["dir"]).normalized()
        loc = T + d * s_["dist"]
        out.append(softbox(s_["name"], s_["w"], s_["h"], tuple(loc), tuple(T), s_["strength"] * scale,
                           edge=s_.get("edge", 0.5), gradient=s_.get("gradient", 0.0), up=s_.get("up", (0, 0, 1)),
                           color=s_.get("color", (1.0, 0.985, 0.96))))
    return out


# Directions are mirror directions computed for the hero camera (view dir ~ (0.47, 0.18, 0.87)):
#   dial/crystal mirror -> (-0.47,-0.18,0.87); 3h flank -> behind-right (0.47,0.16,-0.87);
#   12h chamfer -> (-0.47,0.87,0.18); 3h chamfer -> (0.86,-0.18,0.47); 9h chamfer -> (-0.86,-0.18,-0.47)
HERO_RIG = [
    dict(name="sb_dial_sheen", w=260, h=140, dir=(-0.80, -0.30, 0.52), dist=320, strength=0.6, edge=0.8, up=(0, 1, 0)),
    dict(name="sb_upper_left", w=90, h=520, dir=(-0.50, 0.84, 0.22), dist=300, strength=6.0, edge=0.5, up=(1, 0, 0)),
    dict(name="sb_right_front", w=80, h=460, dir=(0.84, -0.22, 0.50), dist=300, strength=4.5, edge=0.5, up=(0, 1, 0)),
    dict(name="sb_flank_strip", w=70, h=520, dir=(0.52, 0.10, -0.85), dist=320, strength=9.0, edge=0.45, up=(0, 0, 1)),
    dict(name="sb_rim_left", w=60, h=520, dir=(-0.80, -0.10, -0.58), dist=320, strength=6.0, edge=0.45, up=(0, 0, 1)),
    dict(name="sb_strap_fill", w=500, h=500, dir=(0.55, -0.55, 0.62), dist=420, strength=0.75, edge=0.8),
]


def ring_spec(center_dir, radius_deg, angles_deg, w, h, dist, strength, prefix="sb_ring", edge=0.8, gradient=0.0):
    """Soft 'donut' lights on a cone of half-angle radius_deg around center_dir. Each panel's long side (h)
    is tangent to the ring. Used to light the polished bezel without reflecting in the crystal."""
    m = Vector(center_dir).normalized()
    a = m.cross(Vector((0, 0, 1)))
    if a.length < 1e-6:
        a = Vector((1, 0, 0))
    a.normalize()
    b = m.cross(a).normalized()
    out = []
    r = math.radians(radius_deg)
    for k, beta in enumerate(angles_deg):
        be = math.radians(beta)
        radial = a * math.cos(be) + b * math.sin(be)
        d = m * math.cos(r) + radial * math.sin(r)
        tangent = (-a * math.sin(be) + b * math.cos(be)).normalized()
        out.append(dict(name="%s_%d" % (prefix, k), w=w, h=h, dir=tuple(d), dist=dist, strength=strength,
                        edge=edge, gradient=gradient, up=tuple(tangent)))
    return out


CRYSTAL_MIRROR = (-0.468, -0.179, 0.865)
HERO_RIG += ring_spec(CRYSTAL_MIRROR, 16.0, [160.0, 215.0, 270.0, 325.0, 20.0, 90.0], 90, 120, 320, 1.15)
# faint diagonal glass streak on the crystal (soft strip ~4 deg off the crystal mirror direction)
HERO_RIG.append(dict(name="sb_glass_streak", w=34, h=420, dir=tuple((Vector(CRYSTAL_MIRROR).normalized() + Vector((0.05, 0.05, -0.02))).normalized()), dist=330, strength=0.55, edge=0.9, up=(0.70, -0.60, 0.25)))
# wider ring: index facets (roof slopes ~23 deg) mirror directions ~45 deg off the dial mirror
HERO_RIG += ring_spec(CRYSTAL_MIRROR, 46.0, [0.0, 60.0, 120.0, 180.0, 240.0, 300.0], 60, 140, 340, 1.4, prefix="sb_idx")


def rig_product(scale=1.0):
    return rig(HERO_RIG, scale=scale)


def mirror_dir(view_dir, normal=(0, 0, 1)):
    v = Vector(view_dir).normalized()
    n = Vector(normal).normalized()
    return tuple(n * (2.0 * v.dot(n)) - v)


# --- exploded diagram: camera from (0.80,-0.50,0.33); keep lights >45 deg away from the mirror direction of the
#     horizontal plates (-0.80,0.50,0.33) so dial / mainplate / caseback do not blow out; edges from rims.
EXPLODED_CAM_DIR = (0.74, -0.46, 0.50)
EXPLODED_RIG = [
    dict(name="ex_key", w=360, h=260, dir=(0.15, -0.75, 0.65), dist=520, strength=2.4, edge=0.75),
    dict(name="ex_front", w=520, h=380, dir=(0.62, -0.30, 0.72), dist=600, strength=0.9, edge=0.85),
    dict(name="ex_sheen", w=320, h=200, dir=(-0.60, 0.50, 0.62), dist=560, strength=0.8, edge=0.85, gradient=0.6),
    dict(name="ex_fill", w=420, h=300, dir=(0.88, 0.16, 0.13), dist=560, strength=0.45, edge=0.8),
    dict(name="ex_rim_l", w=90, h=600, dir=(-0.85, -0.30, 0.20), dist=520, strength=7.0, edge=0.5, up=(0, 0, 1)),
    dict(name="ex_rim_r", w=90, h=600, dir=(-0.11, 0.90, 0.20), dist=520, strength=7.0, edge=0.5, up=(0, 0, 1)),
    dict(name="ex_top", w=500, h=300, dir=(-0.30, 0.20, 0.93), dist=560, strength=1.2, edge=0.8),
    dict(name="ex_low", w=420, h=120, dir=(0.45, -0.35, -0.82), dist=520, strength=3.0, edge=0.7, up=(1, 0, 0)),
]


def rig_exploded(scale=1.0):
    return rig(EXPLODED_RIG, target=(0, 0, -12), scale=scale)


# --- movement macro from behind: camera dir (-0.25,-0.36,-0.90); bridge tops (normal -Z) mirror (0.25,0.36,-0.90)
MACRO_CAM_DIR = (-0.25, -0.36, -0.90)
MACRO_RIG = [
    dict(name="mc_main", w=170, h=120, dir=(0.42, 0.28, -0.86), dist=260, strength=2.2, edge=0.8, gradient=0.6),
    dict(name="mc_kick", w=40, h=300, dir=(-0.85, 0.30, -0.43), dist=240, strength=7.0, edge=0.5),
    dict(name="mc_rim", w=40, h=300, dir=(0.70, -0.62, -0.35), dist=240, strength=5.0, edge=0.5),
    dict(name="mc_fill", w=260, h=200, dir=(-0.30, -0.42, -0.86), dist=300, strength=0.35, edge=0.8),
    dict(name="mc_back", w=200, h=60, dir=(0.15, 0.95, -0.28), dist=240, strength=4.0, edge=0.6),
]


def rig_macro(scale=1.0):
    from tsg_spec import W, E
    return rig(MACRO_RIG, target=(W[0] * 0.55 + E[0] * 0.45, W[1] * 0.55 + E[1] * 0.45, -3.5), scale=scale)


# --- caseback: camera dir ~(0.19,-0.31,-0.93); medallion (normal -Z) mirror (-0.19,0.31,-0.93)
CASEBACK_CAM_DIR = (0.19, -0.31, -0.93)
CB_MIRROR = (-0.19, 0.31, -0.93)
CASEBACK_RIG = [
    dict(name="cb_sheen", w=230, h=150, dir=(-0.36, 0.46, -0.81), dist=320, strength=1.1, edge=0.8, gradient=0.7),
    dict(name="cb_rim_l", w=70, h=480, dir=(-0.85, -0.25, -0.46), dist=300, strength=6.0, edge=0.5),
    dict(name="cb_rim_r", w=70, h=480, dir=(0.80, 0.35, -0.48), dist=300, strength=5.0, edge=0.5),
    dict(name="cb_fill", w=300, h=300, dir=(0.30, -0.45, -0.84), dist=360, strength=0.35, edge=0.8),
]
CASEBACK_RIG += ring_spec(CB_MIRROR, 17.0, [0.0, 60.0, 120.0, 180.0, 240.0, 300.0], 80, 120, 320, 0.9, prefix="cb_ring")


def rig_caseback(scale=1.0):
    return rig(CASEBACK_RIG, target=(0, 0, -6), scale=scale)
