# build_watch.py -- parametric, re-runnable builder for the TSG-01 hero watch (Blender 5.2).
# Source of truth for the model. Clears and rebuilds ONLY the "TSG" collection.
#
# Run inside Blender (MCP execute_blender_code):
#   exec(open(r"D:\Titan - 3D - site\blender\scripts\build_watch.py", encoding="utf-8").read())
# Optional globals before exec:  TSG_FORCE_TEXTURES = True   (regenerate textures)
#                                TSG_FINISH = "steel"|"gold"|"black", TSG_STRAP = "espresso"|...
import sys
import importlib
import time
import math

SCRIPTS = r"D:\Titan - 3D - site\blender\scripts"
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

import bpy
import tsg_geom
import tsg_spec
import tsg_textures
import tsg_materials
import tsg_parts_case
import tsg_parts_dial
import tsg_parts_movement
import tsg_parts_strap

for _m in (tsg_geom, tsg_spec, tsg_textures, tsg_materials, tsg_parts_case, tsg_parts_dial,
           tsg_parts_movement, tsg_parts_strap):
    importlib.reload(_m)

G, S = tsg_geom, tsg_spec
PC, PD, PM, PS = tsg_parts_case, tsg_parts_dial, tsg_parts_movement, tsg_parts_strap


def setup_scene_units(scene):
    us = scene.unit_settings
    us.system = 'METRIC'
    us.scale_length = 0.001
    us.length_unit = 'MILLIMETERS'


def ensure_collection(scene, name):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
    if c.name not in scene.collection.children:
        scene.collection.children.link(c)
    return c


def clear_collection(coll):
    meshes = set()
    for ob in list(coll.all_objects):
        if ob.type == 'MESH' and ob.data is not None:
            meshes.add(ob.data)
        bpy.data.objects.remove(ob, do_unlink=True)
    for me in meshes:
        if me.users == 0:
            bpy.data.meshes.remove(me)
    for me in list(bpy.data.meshes):
        if me.users == 0 and (me.name.startswith("__") or me.name == "jewel_mesh"):
            bpy.data.meshes.remove(me)


def apply_custom_properties():
    missing = []
    for row in S.part_table():
        ob = bpy.data.objects.get(row["name"])
        if ob is None:
            missing.append(row["name"])
            continue
        for k in ("explode_axis", "explode_distance", "explode_order", "label_en", "label_ar", "group", "finish"):
            v = row[k]
            if k == "explode_axis":
                ob[k] = [float(x) for x in v]
            elif k == "explode_distance":
                ob[k] = float(v)
            elif k == "explode_order":
                ob[k] = int(v)
            else:
                ob[k] = str(v)
    for name, rate in S.SPIN.items():
        ob = bpy.data.objects[name]
        ob["spin_rate"] = float(rate)
        teeth, pinion = S.TEETH[name]
        ob["teeth"] = int(teeth)
        ob["pinion"] = int(pinion)
    bal = bpy.data.objects["balance_wheel"]
    bal["balance_hz"] = 4.0
    bal["amplitude_deg"] = 270.0
    bpy.data.objects["pallet_fork"]["oscillate_deg"] = 10.0
    return missing


def build(force_textures=False, finish="steel", strap="espresso"):
    t0 = time.time()
    scene = bpy.context.scene
    setup_scene_units(scene)
    coll = ensure_collection(scene, "TSG")
    ensure_collection(scene, "TSG_studio")
    clear_collection(coll)
    tex = tsg_textures.build_all(force=force_textures)
    M = tsg_materials.build(finish=finish, strap=strap)
    timings = {}
    builders = [PC.build_case_body, PC.build_bezel, PC.build_crystal, PC.build_crown, PC.build_crown_tube,
                PC.build_caseback, PC.build_caseback_screws, PC.build_gasket,
                PD.build_dial, PD.build_indices, PD.build_logo_plate, PD.build_hands] + PM.BUILDERS + PS.BUILDERS
    for fn in builders:
        t1 = time.time()
        if fn is PD.build_logo_plate:
            fn(coll, M, logo_px=tex["logo"][0])
        else:
            fn(coll, M)
        timings[fn.__name__] = round(time.time() - t1, 2)
    missing = apply_custom_properties()
    tris = {}
    for ob in coll.all_objects:
        if ob.type == 'MESH':
            tris[ob.name] = G.tri_count(ob)
    names = [r["name"] for r in S.part_table()]
    scene["tsg_model"] = "TSG-01 illustrative hero watch"
    scene["tsg_units"] = "1 BU = 1 mm; watch space +Z dial normal, +Y 12h, +X 3h"
    return {
        "parts_expected": len(names),
        "parts_found": len([n for n in names if bpy.data.objects.get(n)]),
        "missing": missing,
        "total_tris": sum(tris.values()),
        "tris": tris,
        "timings": timings,
        "seconds": round(time.time() - t0, 1),
    }


result = build(force_textures=globals().get("TSG_FORCE_TEXTURES", False),
               finish=globals().get("TSG_FINISH", "steel"), strap=globals().get("TSG_STRAP", "espresso"))
