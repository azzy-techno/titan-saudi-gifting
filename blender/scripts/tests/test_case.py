import sys, importlib, time
SCRIPTS = r"D:\Titan - 3D - site\blender\scripts"
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)
import bpy
import tsg_geom, tsg_spec, tsg_materials, tsg_parts_case
for m in (tsg_geom, tsg_spec, tsg_materials, tsg_parts_case):
    importlib.reload(m)
G, PC = tsg_geom, tsg_parts_case
t0 = time.time()
coll = bpy.data.collections.get("TSG_test") or bpy.data.collections.new("TSG_test")
if coll.name not in bpy.context.scene.collection.children:
    bpy.context.scene.collection.children.link(coll)
for o in list(coll.objects):
    bpy.data.objects.remove(o, do_unlink=True)
M = {m.name: m for m in bpy.data.materials if m.name.startswith("m_")}
info = {}
for fn in (PC.build_case_body, PC.build_bezel, PC.build_crystal, PC.build_crown, PC.build_crown_tube,
           PC.build_caseback, PC.build_caseback_screws, PC.build_gasket):
    t1 = time.time()
    r = fn(coll, M)
    obs = r if isinstance(r, list) else [r]
    for o in obs:
        info[o.name] = [G.tri_count(o), round(time.time() - t1, 2)]
info["total_s"] = round(time.time() - t0, 2)
result = info
