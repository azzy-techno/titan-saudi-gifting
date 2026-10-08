# Test: does the Blender 5.2 glTF exporter write KHR_materials_anisotropy?
# Run: blender.exe -b --factory-startup -P blender/scripts/tests/test_aniso_export.py
import bpy, json, os

ROOT = r"D:\Titan - 3D - site"
OUT = os.path.join(ROOT, "blender", "wip", "tmp")
os.makedirs(OUT, exist_ok=True)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)

bpy.ops.mesh.primitive_plane_add(size=2)
ob = bpy.context.active_object
ob.name = "aniso_plane"


def make(name, variant):
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    p = nt.nodes.get("Principled BSDF")
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = 0.3
    p.inputs["Anisotropic"].default_value = 0.8
    if variant == "rot_const":
        p.inputs["Anisotropic Rotation"].default_value = 0.25
    if variant in ("tangent_uv", "rot_const"):
        t = nt.nodes.new("ShaderNodeTangent")
        t.direction_type = 'UV_MAP'
        t.uv_map = "UVMap"
        nt.links.new(t.outputs["Tangent"], p.inputs["Tangent"])
    return m

mats = [make("aniso_plain", "plain"), make("aniso_tangent_uv", "tangent_uv"), make("aniso_rot", "rot_const")]
results = {}
for m in mats:
    ob.data.materials.clear()
    ob.data.materials.append(m)
    path = os.path.join(OUT, m.name + ".gltf")
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLTF_SEPARATE', export_tangents=True,
                              export_extras=True, export_yup=True, export_apply=True)
    with open(path, encoding="utf-8") as f:
        g = json.load(f)
    results[m.name] = {
        "extensionsUsed": g.get("extensionsUsed"),
        "material": g["materials"][0],
        "attributes": list(g["meshes"][0]["primitives"][0]["attributes"].keys()),
    }
with open(os.path.join(OUT, "aniso_results.json"), "w", encoding="utf-8") as f:
    json.dump(results, f, indent=1)
print("ANISO_RESULTS", json.dumps(results))
