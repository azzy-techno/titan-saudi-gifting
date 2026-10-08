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
    dict(name="sb_dial_sheen", w=300, h=170, dir=(-0.62, -0.05, 0.78), dist=320, strength=1.3, edge=0.75, up=(0, 1, 0)),
    dict(name="sb_upper_left", w=90, h=520, dir=(-0.50, 0.84, 0.22), dist=300, strength=6.0, edge=0.5, up=(1, 0, 0)),
    dict(name="sb_right_front", w=80, h=460, dir=(0.84, -0.22, 0.50), dist=300, strength=4.5, edge=0.5, up=(0, 1, 0)),
    dict(name="sb_flank_strip", w=70, h=520, dir=(0.52, 0.10, -0.85), dist=320, strength=9.0, edge=0.45, up=(0, 0, 1)),
    dict(name="sb_rim_left", w=60, h=520, dir=(-0.80, -0.10, -0.58), dist=320, strength=6.0, edge=0.45, up=(0, 0, 1)),
    dict(name="sb_strap_fill", w=500, h=500, dir=(0.55, -0.55, 0.62), dist=420, strength=0.55, edge=0.8),
]


def rig_product(scale=1.0):
    return rig(HERO_RIG, scale=scale)
