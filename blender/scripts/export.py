# export.py -- glTF export of the TSG collection only (no studio, cameras or lights).
# Run inside Blender:  exec(open(r"D:\Titan - 3D - site\blender\scripts\export.py", encoding="utf-8").read())
# or background:       blender -b --factory-startup <blend> -P blender/scripts/export.py
import os
import json
import bpy

ROOT = r"D:\Titan - 3D - site"
OUT = os.path.join(ROOT, "blender", "export", "watch_raw.glb")


def export(path=OUT):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene = bpy.context.scene
    # rest pose for the web: hands at 12:00, nothing exploded
    for n in ("hand_hour", "hand_minute", "hand_seconds"):
        ob = bpy.data.objects.get(n)
        if ob:
            ob.rotation_euler = (0.0, 0.0, 0.0)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        collection="TSG",
        use_selection=False,
        use_visible=False,
        use_renderable=False,
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_animations=False,
        export_gpu_instances=False,
        export_hierarchy_flatten_objs=False,
        export_shared_accessors=False,
        will_save_settings=False,
    )
    return {"path": path, "bytes": os.path.getsize(path)}


result = export()
print("EXPORT_INFO " + json.dumps(result))
