# tsg_preview.py -- quick offscreen preview renders (Workbench / EEVEE) into blender/wip/.
import math
import bpy
from mathutils import Vector


def _studio_coll():
    c = bpy.data.collections.get("TSG_studio")
    if c is None:
        c = bpy.data.collections.new("TSG_studio")
        bpy.context.scene.collection.children.link(c)
    return c


def look_at(obj, target, up=(0.0, 1.0, 0.0)):
    loc = Vector(obj.location)
    fwd = (Vector(target) - loc).normalized()
    upv = Vector(up)
    if abs(fwd.dot(upv.normalized())) > 0.999:
        upv = Vector((0.0, 0.0, 1.0)) if abs(fwd.z) < 0.9 else Vector((0.0, 1.0, 0.0))
    right = fwd.cross(upv).normalized()
    true_up = right.cross(fwd).normalized()
    # camera looks down -Z, +Y up
    from mathutils import Matrix
    m = Matrix((right, true_up, -fwd)).transposed()
    obj.rotation_euler = m.to_euler()


def preview(path, target=(0, 0, 0), direction=(0.4, 0.2, 1.0), distance=120.0, lens=50.0,
            size=(960, 600), engine='BLENDER_WORKBENCH', matcap=None, up=(0, 1, 0), hide=None,
            ortho_scale=None, samples=16):
    scene = bpy.context.scene
    coll = _studio_coll()
    cam = bpy.data.objects.get("cam_preview")
    if cam is None:
        cd = bpy.data.cameras.new("cam_preview")
        cam = bpy.data.objects.new("cam_preview", cd)
        coll.objects.link(cam)
    cd = cam.data
    cd.lens = lens
    cd.clip_start = 1.0
    cd.clip_end = 5000.0
    cd.sensor_fit = 'AUTO'
    cd.type = 'ORTHO' if ortho_scale else 'PERSP'
    if ortho_scale:
        cd.ortho_scale = ortho_scale
    d = Vector(direction).normalized()
    cam.location = Vector(target) + d * distance
    look_at(cam, target, up)
    old = {
        "camera": scene.camera, "engine": scene.render.engine, "rx": scene.render.resolution_x,
        "ry": scene.render.resolution_y, "pct": scene.render.resolution_percentage,
        "fp": scene.render.filepath, "transp": scene.render.film_transparent,
    }
    hidden = []
    if hide:
        for o in bpy.data.objects:
            if any(o.name.startswith(h) for h in hide) and not o.hide_render:
                o.hide_render = True
                hidden.append(o)
    try:
        scene.camera = cam
        scene.render.engine = engine
        scene.render.resolution_x, scene.render.resolution_y = size
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = False
        if engine == 'BLENDER_WORKBENCH':
            sh = scene.display.shading
            sh.light = 'MATCAP' if matcap else 'STUDIO'
            if matcap:
                sh.studio_light = matcap
            sh.color_type = 'MATERIAL' if not matcap else 'SINGLE'
            sh.show_specular_highlight = True
            scene.display.render_aa = '8'
        elif engine == 'CYCLES':
            scene.cycles.samples = samples
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
    finally:
        scene.camera = old["camera"]
        scene.render.engine = old["engine"]
        scene.render.resolution_x = old["rx"]
        scene.render.resolution_y = old["ry"]
        scene.render.resolution_percentage = old["pct"]
        scene.render.filepath = old["fp"]
        scene.render.film_transparent = old["transp"]
        for o in hidden:
            o.hide_render = False
    return path
