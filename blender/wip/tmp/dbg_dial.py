import sys, math
sys.path.insert(0, r"D:\Titan - 3D - site\blender\scripts")
import bpy, numpy as np
import tsg_studio as ST
me = bpy.data.objects["dial"].data
uv = me.uv_layers["UVMap"].data
vs = np.zeros(len(uv)*2); uv.foreach_get("uv", vs); vs = vs.reshape(-1,2)
print("DIAL_UV_RANGE", vs.min(0), vs.max(0))
m = bpy.data.materials["m_dial"]
print("DIAL_NODES", [(n.bl_idname, getattr(n, 'uv_map', None), getattr(getattr(n,'image',None),'name',None)) for n in m.node_tree.nodes])
img = bpy.data.images.get("dial_basecolor.png")
print("IMG", img and (img.filepath, img.size[:], img.colorspace_settings.name, img.has_data))
