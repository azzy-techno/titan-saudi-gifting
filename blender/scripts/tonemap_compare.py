# tonemap_compare.py -- apply several view transforms to one linear EXR render (same pixels).
# blender -b --factory-startup -P blender/scripts/tonemap_compare.py -- <in.exr> <out_prefix>
import sys
import os
import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
src, prefix = argv[0], argv[1]
scene = bpy.context.scene
img = bpy.data.images.load(src)
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
available = [i.identifier for i in scene.view_settings.bl_rna.properties['view_transform'].enum_items]
done = []
for vt in ("AgX", "Filmic", "Standard", "Khronos PBR Neutral"):
    try:
        scene.view_settings.view_transform = vt
        scene.view_settings.look = 'None'
    except TypeError:
        continue
    out = "%s_%s.png" % (prefix, vt.replace(" ", ""))
    img.save_render(out, scene=scene)
    done.append(out)
print("TONEMAP_DONE", done, "available:", available)
