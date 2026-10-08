# Quick test of tsg_geom in a throwaway collection "TSG_test".
import sys, importlib, math, time
SCRIPTS = r"D:\Titan - 3D - site\blender\scripts"
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)
import numpy as np
import bpy
import tsg_geom as G
importlib.reload(G)

t0 = time.time()
coll = bpy.data.collections.get("TSG_test") or bpy.data.collections.new("TSG_test")
if coll.name not in bpy.context.scene.collection.children:
    bpy.context.scene.collection.children.link(coll)
for o in list(coll.objects):
    bpy.data.objects.remove(o, do_unlink=True)

mat = bpy.data.materials.get("__test_mat") or bpy.data.materials.new("__test_mat")
info = {}

# 1) bridge-like SDF with two jewel holes
grid = G.Grid(-8, 8, -5, 5, 0.02)
X, Y = grid.X, grid.Y
F = G.sd_capsule(X, Y, (-5, 0), (5, 0), 1.6)
F = G.smin(F, G.sd_circle(X, Y, (0, 0), 3.0), 1.5)
F = np.maximum(F, -G.sd_circle(X, Y, (-5, 0), 0.6))
F = np.maximum(F, -G.sd_circle(X, Y, (5, 0), 0.6))
loops = G.sdf_to_loops(F, grid, tol=0.0015, max_len=0.25)
info["bridge_loops"] = [(len(L), round(G.loop_area(L), 3)) for L in loops]
bm = G.new_bm()
prof = [(0.06, 0.0), (0.0, 0.06), (0.0, 0.5), (0.03, 0.56), (0.08, 0.6)]
res = G.sweep(bm, loops, prof, cap_uv=lambda x, y, z, up: (x / 10, y / 10))
ob = G.finalize_mesh_object("t_bridge", bm, coll, [mat], location=(0, 12, 0))
info["bridge_tris"] = G.tri_count(ob)
info["bridge_custom_normals"] = ob.data.has_custom_normals

# 2) wheel with 5 spokes
z, m = 80, 0.12
outline = G.wheel_outline(z, m)
rp = m * z / 2
grid2 = G.Grid(-5, 5, -5, 5, 0.01)
X, Y = grid2.X, grid2.Y
r = np.hypot(X, Y)
ann = np.maximum(0.9 - r, r - (rp - 0.75))
sp = None
for k in range(5):
    a = math.radians(90 + k * 72)
    c = G.sd_capsule(X, Y, (0, 0), (5 * math.cos(a), 5 * math.sin(a)), 0.16)
    sp = c if sp is None else np.minimum(sp, c)
win = G.smax(ann, -sp, 0.12)
wl = [L[::-1].copy() for L in G.sdf_to_loops(win, grid2, tol=0.001, max_len=0.2)]
info["wheel_outline_pts"] = len(outline)
info["windows"] = [(len(L), round(G.loop_area(L), 3)) for L in wl]
bm = G.new_bm()
prof = [(0.0, 0.0), (0.0, 0.17), (0.025, 0.2)]
G.sweep(bm, [outline] + wl, prof, cap_uv=lambda x, y, z, up: (x / 26 + 0.5, y / 26 + 0.5))
ob2 = G.finalize_mesh_object("t_wheel", bm, coll, [mat], location=(12, 0, 0))
info["wheel_tris"] = G.tri_count(ob2)

# 3) revolve bezel-like profile
pts = [(17.32, 2.4), (19.5, 2.4), (19.5, 3.1), (19.2, 3.4), (17.55, 3.12), (17.32, 3.0)]
pr = G.fillet(pts, [0, 0, 0.3, 0.12, 0.08, 0], segs=4, closed=True)
bm = G.new_bm()
G.revolve(bm, pr, 128, closed=True)
ob3 = G.finalize_mesh_object("t_bezel", bm, coll, [mat], location=(-45, 0, 0))
info["bezel_tris"] = G.tri_count(ob3)
info["seconds"] = round(time.time() - t0, 2)
result = info
