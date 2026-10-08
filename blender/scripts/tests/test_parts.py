# Build selected part groups into TSG_test for inspection.
# usage (MCP): GROUPS = ["case", "dial"]; exec(open(...).read())
import sys, importlib, time, math
SCRIPTS = r"D:\Titan - 3D - site\blender\scripts"
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)
import bpy
import tsg_geom, tsg_spec, tsg_textures, tsg_materials, tsg_parts_case, tsg_parts_dial
mods = [tsg_geom, tsg_spec, tsg_textures, tsg_materials, tsg_parts_case, tsg_parts_dial]
tsg_parts_movement = tsg_parts_strap = None
try:
    import tsg_parts_movement
    mods.append(tsg_parts_movement)
except ImportError as e:
    print("no movement", e)
try:
    import tsg_parts_strap
    mods.append(tsg_parts_strap)
except ImportError as e:
    print("no strap", e)
for m in mods:
    importlib.reload(m)
G = tsg_geom
groups = globals().get("GROUPS", ["case", "dial"])
t0 = time.time()
coll = bpy.data.collections.get("TSG_test") or bpy.data.collections.new("TSG_test")
if coll.name not in bpy.context.scene.collection.children:
    bpy.context.scene.collection.children.link(coll)
for o in list(coll.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for me in list(bpy.data.meshes):
    if me.users == 0:
        bpy.data.meshes.remove(me)
M = {m.name: m for m in bpy.data.materials if m.name.startswith("m_")}
fns = []
PC, PD = tsg_parts_case, tsg_parts_dial
if "case" in groups:
    fns += [PC.build_case_body, PC.build_bezel, PC.build_crystal, PC.build_crown, PC.build_crown_tube,
            PC.build_caseback, PC.build_caseback_screws, PC.build_gasket]
if "dial" in groups:
    fns += [PD.build_dial, PD.build_indices, PD.build_logo_plate, PD.build_hands]
if "movement" in groups and tsg_parts_movement:
    fns += tsg_parts_movement.BUILDERS
if "strap" in groups and tsg_parts_strap:
    fns += tsg_parts_strap.BUILDERS
info = {}
for fn in fns:
    t1 = time.time()
    r = fn(coll, M)
    obs = r if isinstance(r, list) else [r]
    for o in obs:
        info[o.name] = G.tri_count(o)
    info["_t_" + fn.__name__] = round(time.time() - t1, 2)
# pose hands 10:10:35
hh, mm, ss = tsg_spec.POSE_TIME
ang = {"hand_hour": (hh % 12 + mm / 60 + ss / 3600) * 30, "hand_minute": (mm + ss / 60) * 6, "hand_seconds": ss * 6}
for n, a in ang.items():
    o = bpy.data.objects.get(n)
    if o:
        o.rotation_euler = (0, 0, -math.radians(a))
info["_total_tris"] = sum(v for k, v in info.items() if not k.startswith("_"))
info["_total_s"] = round(time.time() - t0, 2)
result = info
