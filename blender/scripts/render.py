# render.py -- background Cycles renders (QC2 + WIP). Never saves the .blend or user preferences.
# Usage (from the project root, Git Bash):
#   "/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup "blender/watch_v00N.blend" \
#       -P blender/scripts/render.py -- --shot hero --out qa/qc2/01-hero-three-quarter.png --samples 512
# Shots: hero | exploded | macro | caseback | finish_steel | finish_gold | finish_black
import sys
import os
import math
import time
import json
import argparse

SCRIPTS = r"D:\Titan - 3D - site\blender\scripts"
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

import bpy
from mathutils import Vector

import tsg_spec as S
import tsg_studio as ST
import tsg_materials as TM

ROOT = S.ROOT


def parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", default="hero")
    ap.add_argument("--out", required=True)
    ap.add_argument("--samples", type=int, default=256)
    ap.add_argument("--res", default="1600x1000")
    ap.add_argument("--view", default="AgX")
    ap.add_argument("--look", default="AgX - Medium High Contrast")
    ap.add_argument("--exposure", type=float, default=0.0)
    ap.add_argument("--strap", default=None)
    ap.add_argument("--exr", default=None)
    ap.add_argument("--cpu", action="store_true")
    ap.add_argument("--light", type=float, default=1.0)
    ap.add_argument("--world", type=float, default=None)
    ap.add_argument("--hide", default="")
    ap.add_argument("--cam", default="")
    return ap.parse_args(argv)


def setup_device(cpu=False):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    if cpu:
        scene.cycles.device = 'CPU'
        return "CPU"
    prefs = bpy.context.preferences.addons['cycles'].preferences   # runtime only (factory startup, never saved)
    for dev_type in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = dev_type
        except TypeError:
            continue
        try:
            prefs.refresh_devices()
        except Exception:
            prefs.get_devices()
        devs = [d for d in prefs.devices if d.type == dev_type]
        if devs:
            for d in prefs.devices:
                d.use = (d.type == dev_type)
            scene.cycles.device = 'GPU'
            return dev_type + ": " + ", ".join(d.name for d in devs)
    scene.cycles.device = 'CPU'
    return "CPU (fallback)"


def setup_cycles(samples, res, view, look, exposure):
    scene = bpy.context.scene
    c = scene.cycles
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.006
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    try:
        c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
        c.denoising_prefilter = 'ACCURATE'
        c.denoising_quality = 'HIGH'
    except Exception:
        pass
    c.max_bounces = 16
    c.diffuse_bounces = 4
    c.glossy_bounces = 10
    c.transmission_bounces = 14
    c.transparent_max_bounces = 16
    c.caustics_reflective = True
    c.caustics_refractive = True
    c.blur_glossy = 0.5
    c.sample_clamp_indirect = 8.0
    scene.render.film_transparent = True
    try:
        c.film_transparent_glass = False
    except Exception:
        pass
    W, H = [int(x) for x in res.lower().split("x")]
    scene.render.resolution_x = W
    scene.render.resolution_y = H
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '16'
    vs = scene.view_settings
    vs.view_transform = view
    try:
        vs.look = look if look != "None" else 'None'
    except TypeError:
        pass
    vs.exposure = exposure
    vs.gamma = 1.0
    scene.display_settings.display_device = 'sRGB'
    return W, H


def render_only_material_tweaks():
    # crystal: let shadow rays pass (flat-ish sapphire, no caustic noise on the dial)
    m = bpy.data.materials.get("m_sapphire")
    nt = m.node_tree
    out = [n for n in nt.nodes if n.bl_idname == "ShaderNodeOutputMaterial"][0]
    p = nt.nodes.get("Principled BSDF")
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Shadow Ray"], mix.inputs["Fac"])
    nt.links.new(p.outputs["BSDF"], mix.inputs[1])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])


def pose_hands(t=S.POSE_TIME):
    hh, mm, ss = t
    ang = {"hand_hour": (hh % 12 + mm / 60 + ss / 3600) * 30, "hand_minute": (mm + ss / 60) * 6, "hand_seconds": ss * 6}
    for n, a in ang.items():
        bpy.data.objects[n].rotation_euler = (0, 0, -math.radians(a))


def explode(scale=1.0):
    for ob in bpy.data.collections["TSG"].objects:
        if "explode_axis" in ob and ob.parent is None:
            ax = Vector(ob["explode_axis"])
            if ax.length > 0:
                ob.location = ob.location + ax.normalized() * ob["explode_distance"] * scale


def hide(prefixes):
    tsg = bpy.data.collections["TSG"]
    for ob in list(bpy.data.objects):
        if ob is None or tsg not in ob.users_collection:
            continue
        if any(ob.name.startswith(p) for p in prefixes if p):
            ob.hide_render = True
            for ch in ob.children_recursive:
                ch.hide_render = True


def engraving_material(mask_normal, mask_rough):
    """Render-only: drive the medallion with the engraving maps (glTF-compatible nodes)."""
    m = bpy.data.materials.get("m_engraving_area")
    nt = m.node_tree
    p = nt.nodes.get("Principled BSDF")
    uv = [n for n in nt.nodes if n.bl_idname == "ShaderNodeUVMap"][0]
    imgN = bpy.data.images.load(mask_normal, check_existing=True)
    imgN.colorspace_settings.name = 'Non-Color'
    imgR = bpy.data.images.load(mask_rough, check_existing=True)
    imgR.colorspace_settings.name = 'Non-Color'
    tN = nt.nodes.new("ShaderNodeTexImage")
    tN.image = imgN
    tR = nt.nodes.new("ShaderNodeTexImage")
    tR.image = imgR
    nt.links.new(uv.outputs["UV"], tN.inputs["Vector"])
    nt.links.new(uv.outputs["UV"], tR.inputs["Vector"])
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = 1.0
    nt.links.new(tN.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], p.inputs["Normal"])
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tR.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], p.inputs["Roughness"])
    # engraved areas slightly darker
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = 'RGBA'
    mix.blend_type = 'MIX'
    for s in mix.inputs:
        if s.identifier == "A_Color":
            s.default_value = p.inputs["Base Color"].default_value[:]
        if s.identifier == "B_Color":
            bc = p.inputs["Base Color"].default_value
            s.default_value = (bc[0] * 0.30, bc[1] * 0.30, bc[2] * 0.30, 1.0)
    nt.links.new(sep.outputs["Red"], [s for s in mix.inputs if s.identifier == "Factor_Float"][0])
    nt.links.new([s for s in mix.outputs if s.identifier == "Result_Color"][0], p.inputs["Base Color"])
    # circular graining read: anisotropy with a radial (circumferential) tangent about the caseback axis
    # (render-only; glTF keeps the plain medallion material, the web replaces its maps live)
    p.inputs["Anisotropic"].default_value = 0.75
    tg = nt.nodes.new("ShaderNodeTangent")
    tg.direction_type = 'RADIAL'
    tg.axis = 'Z'
    nt.links.new(tg.outputs["Tangent"], p.inputs["Tangent"])


def main():
    a = parse()
    t0 = time.time()
    scene = bpy.context.scene
    dev = setup_device(a.cpu)
    W, H = setup_cycles(a.samples, a.res, a.view, a.look, a.exposure)
    TM.build()                      # always render with the current material definitions
    render_only_material_tweaks()
    ST.clear_studio()
    shot = a.shot
    world = 0.22
    light = a.light
    up = (0, 1, 0)
    if shot.startswith("finish_"):
        fin = shot.split("_", 1)[1]
        TM.apply_finish(fin)
        TM.apply_strap(a.strap or {"steel": "espresso", "gold": "cognac", "black": "black"}[fin])
    elif a.strap:
        TM.apply_strap(a.strap)
    if shot in ("hero",) or shot.startswith("finish_"):
        pose_hands()
        ST.hero_camera(res=(W, H), shift_override=0.0)
        ST.rig_product(light)
        world_rot = 35.0
    elif shot == "exploded":
        pose_hands()
        explode()
        tgt = Vector((0.0, 0.0, -13.0))
        pos = tgt + Vector(ST.EXPLODED_CAM_DIR).normalized() * 398.0
        cam = ST.camera("cam_exploded", tuple(pos), tuple(tgt), 21.0, up=(0, 0, 1), res=(W, H))
        ST.rig_exploded(light) if hasattr(ST, "rig_exploded") else ST.rig_product(light)
        world_rot = 35.0
    elif shot == "macro":
        hide(["caseback", "gasket", "rotor", "strap_", "buckle"])
        tgt = Vector((S.W[0] * 0.55 + S.E[0] * 0.45, S.W[1] * 0.55 + S.E[1] * 0.45, -3.55))
        pos = tgt + Vector((-14.0, -20.0, -46.0))
        cam = ST.camera("cam_macro", tuple(pos), tuple(tgt), 18.0, up=(0, 1, 0), res=(W, H))
        cd = cam.data
        cd.dof.use_dof = True
        focus = Vector((S.W[0], S.W[1], -4.0))
        cd.dof.focus_distance = (pos - focus).length
        # Cycles ignores the 0.001 unit scale for the aperture: N_blender = N_real * 0.001 (here ~f/30 real)
        cd.dof.aperture_fstop = 0.030
        ST.rig_macro(light) if hasattr(ST, "rig_macro") else ST.rig_product(light)
        world_rot = 120.0
    elif shot == "caseback":
        hide(["strap_", "buckle"])
        mn = os.path.join(S.TEX_DIR, "engraving_normal.png")
        mr = os.path.join(S.TEX_DIR, "engraving_rough.png")
        if os.path.exists(mn):
            engraving_material(mn, mr)
        cam = ST.camera("cam_caseback", (52.0, -64.0, -150.0), (0.0, 1.0, -6.5), 17.0, up=(0, 1, 0), res=(W, H))
        ST.rig_caseback(light) if hasattr(ST, "rig_caseback") else ST.rig_product(light)
        world_rot = 200.0
    else:
        raise SystemExit("unknown shot " + shot)
    if a.hide:
        hide(a.hide.split(","))
    if a.cam:
        for o in [o for o in ST.studio_coll().objects if o.type == 'CAMERA' and o.name != "cam_preview"]:
            bpy.data.objects.remove(o, do_unlink=True)
        px, py, pz, tx, ty, tz, fov = [float(v) for v in a.cam.split(",")]
        ST.camera("cam_custom", (px, py, pz), (tx, ty, tz), fov, up=(0, 1, 0), res=(W, H))
    ST.setup_world(strength=a.world if a.world is not None else world, rot_deg=world_rot)
    scene.camera = [o for o in ST.studio_coll().objects if o.type == 'CAMERA' and o.name != "cam_preview"][0]
    out = os.path.join(ROOT, a.out) if not os.path.isabs(a.out) else a.out
    os.makedirs(os.path.dirname(out), exist_ok=True)
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    if a.exr:
        img = bpy.data.images["Render Result"]
        scene.render.image_settings.file_format = 'OPEN_EXR'
        scene.render.image_settings.color_depth = '32'
        img.save_render(os.path.join(ROOT, a.exr))
    info = {"shot": shot, "out": out, "device": dev, "samples": a.samples, "res": [W, H], "view": a.view,
            "seconds": round(time.time() - t0, 1)}
    print("RENDER_INFO " + json.dumps(info))


main()
