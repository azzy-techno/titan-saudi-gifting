# tsg_materials.py -- glTF-compatible Principled BSDF materials (names fixed by WATCH_SPEC section 5)
# + finish variants (steel / gold / black) and strap colourways.
import os
import bpy

import tsg_spec as S

TEX = S.TEX_DIR

# linear RGB
FINISHES = {
    "steel": dict(polished=(0.660, 0.660, 0.650), brushed=(0.600, 0.600, 0.590), rough_p=0.055, rough_b=0.30),
    "gold": dict(polished=(0.900, 0.700, 0.480), brushed=(0.860, 0.665, 0.455), rough_p=0.060, rough_b=0.30),
    "black": dict(polished=(0.050, 0.050, 0.054), brushed=(0.045, 0.045, 0.049), rough_p=0.13, rough_b=0.34),
}
STRAPS = {
    "espresso": dict(leather=(0.072, 0.043, 0.028), stitch=(0.125, 0.085, 0.060)),
    "cognac": dict(leather=(0.120, 0.052, 0.022), stitch=(0.200, 0.110, 0.060)),
    "black": dict(leather=(0.014, 0.014, 0.015), stitch=(0.040, 0.040, 0.042)),
}


def _img(name, noncolor=True):
    path = os.path.join(TEX, name + ".png")
    img = bpy.data.images.get(name + ".png")
    if img is None or os.path.normcase(bpy.path.abspath(img.filepath)) != os.path.normcase(path):
        img = bpy.data.images.load(path, check_existing=True)
    else:
        img.reload()
    img.colorspace_settings.name = 'Non-Color' if noncolor else 'sRGB'
    return img


def _new(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (400, 0)
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    p.location = (0, 0)
    nt.links.new(p.outputs["BSDF"], out.inputs["Surface"])
    m.use_backface_culling = True
    return m, nt, p


def _uv(nt, x=-900, y=0):
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    uv.location = (x, y)
    return uv


def _tex(nt, img, uvnode, x, y):
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img
    t.location = (x, y)
    t.interpolation = 'Linear'
    nt.links.new(uvnode.outputs["UV"], t.inputs["Vector"])
    return t


def _normal(nt, p, img, uvnode, strength, x=-450, y=-500):
    t = _tex(nt, img, uvnode, x - 350, y)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.space = 'TANGENT'
    nm.uv_map = "UVMap"
    nm.inputs["Strength"].default_value = strength
    nm.location = (x, y)
    nt.links.new(t.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], p.inputs["Normal"])
    return t, nm


def _aniso(nt, p, amount, rot=0.0):
    p.inputs["Anisotropic"].default_value = amount
    p.inputs["Anisotropic Rotation"].default_value = rot
    tg = nt.nodes.new("ShaderNodeTangent")
    tg.direction_type = 'UV_MAP'
    tg.uv_map = "UVMap"
    tg.location = (-300, -800)
    nt.links.new(tg.outputs["Tangent"], p.inputs["Tangent"])


def _sock(coll, ident):
    for s_ in coll:
        if s_.identifier == ident:
            return s_
    raise KeyError(ident)


def _metal(p, col, rough):
    p.inputs["Base Color"].default_value = (*col, 1.0)
    p.inputs["Metallic"].default_value = 1.0
    p.inputs["Roughness"].default_value = rough


def build(finish="steel", strap="espresso"):
    mats = {}
    fin = FINISHES[finish]

    m, nt, p = _new("m_steel_polished")
    _metal(p, fin["polished"], fin["rough_p"])
    mats[m.name] = m

    m, nt, p = _new("m_steel_brushed")
    _metal(p, fin["brushed"], fin["rough_b"])
    uv = _uv(nt)
    _normal(nt, p, _img("brushed_normal"), uv, 0.35)
    _aniso(nt, p, 0.75)
    mats[m.name] = m

    m, nt, p = _new("m_engraving_area")
    _metal(p, fin["brushed"], fin["rough_b"] + 0.02)
    uv = _uv(nt)
    _normal(nt, p, _img("circular_grain_normal"), uv, 0.8)
    mats[m.name] = m

    m, nt, p = _new("m_sapphire")
    p.inputs["Base Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    p.inputs["Metallic"].default_value = 0.0
    p.inputs["Roughness"].default_value = 0.0
    p.inputs["IOR"].default_value = 1.77
    p.inputs["Transmission Weight"].default_value = 1.0
    m.use_backface_culling = False
    mats[m.name] = m

    # dial: polar UV (u = angle, v = radius); graphite metallic under a lacquer coat
    m, nt, p = _new("m_dial")
    uv = _uv(nt)
    tb = _tex(nt, _img("dial_basecolor", noncolor=False), uv, -600, 300)
    nt.links.new(tb.outputs["Color"], p.inputs["Base Color"])
    tm = _tex(nt, _img("dial_metal_rough"), uv, -600, 0)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    sep.location = (-300, 0)
    nt.links.new(tm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], p.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], p.inputs["Metallic"])
    _normal(nt, p, _img("dial_sunburst_normal"), uv, 0.9)
    _aniso(nt, p, 0.95)
    p.inputs["Coat Weight"].default_value = 0.25
    p.inputs["Coat Roughness"].default_value = 0.035
    p.inputs["Coat IOR"].default_value = 1.5
    mats[m.name] = m

    m, nt, p = _new("m_logo")
    uv = _uv(nt)
    tl = _tex(nt, _img("logo_alpha", noncolor=False), uv, -700, 0)
    gt = nt.nodes.new("ShaderNodeMath")
    gt.operation = 'GREATER_THAN'
    gt.inputs[1].default_value = 0.5
    gt.location = (-300, -100)
    nt.links.new(tl.outputs["Alpha"], gt.inputs[0])
    nt.links.new(gt.outputs["Value"], p.inputs["Alpha"])
    p.inputs["Base Color"].default_value = (0.86, 0.82, 0.74, 1.0)
    p.inputs["Metallic"].default_value = 0.85
    p.inputs["Roughness"].default_value = 0.26
    m.use_backface_culling = False
    try:
        m.surface_render_method = 'DITHERED'
    except Exception:
        pass
    mats[m.name] = m

    m, nt, p = _new("m_lume")
    p.inputs["Base Color"].default_value = (0.60, 0.61, 0.52, 1.0)   # aged-cream lume (not paper white)
    p.inputs["Metallic"].default_value = 0.0
    p.inputs["Roughness"].default_value = 0.42
    mats[m.name] = m

    m, nt, p = _new("m_accent")   # champagne / brass lacquer (seconds hand)
    _metal(p, (0.86, 0.66, 0.42), 0.16)
    p.inputs["Coat Weight"].default_value = 0.5
    p.inputs["Coat Roughness"].default_value = 0.05
    mats[m.name] = m

    m, nt, p = _new("m_ruby")
    p.inputs["Base Color"].default_value = (0.62, 0.012, 0.030, 1.0)
    p.inputs["Metallic"].default_value = 0.0
    p.inputs["Roughness"].default_value = 0.03
    p.inputs["IOR"].default_value = 1.76
    p.inputs["Transmission Weight"].default_value = 0.6
    mats[m.name] = m

    m, nt, p = _new("m_rubber")
    p.inputs["Base Color"].default_value = (0.018, 0.018, 0.02, 1.0)
    p.inputs["Metallic"].default_value = 0.0
    p.inputs["Roughness"].default_value = 0.62
    mats[m.name] = m

    m, nt, p = _new("m_plate")    # rhodium + perlage
    _metal(p, (0.60, 0.615, 0.63), 0.30)
    uv = _uv(nt)
    _normal(nt, p, _img("perlage_normal"), uv, 0.55)
    mats[m.name] = m

    m, nt, p = _new("m_bridge")   # rhodium + Cotes de Geneve
    _metal(p, (0.63, 0.64, 0.66), 0.17)
    uv = _uv(nt)
    _normal(nt, p, _img("cotes_normal"), uv, 0.6)
    mats[m.name] = m

    m, nt, p = _new("m_gilt")     # gold-tone wheels / rotor, circular graining
    _metal(p, (0.93, 0.72, 0.42), 0.20)
    uv = _uv(nt)
    _normal(nt, p, _img("circular_grain_normal"), uv, 0.35)
    mats[m.name] = m

    m, nt, p = _new("m_movement_steel")
    _metal(p, (0.64, 0.64, 0.645), 0.07)
    mats[m.name] = m

    m, nt, p = _new("m_hairspring")
    _metal(p, (0.62, 0.56, 0.50), 0.18)
    mats[m.name] = m

    st = STRAPS[strap]
    m, nt, p = _new("m_leather")
    uv = _uv(nt)
    tt = _tex(nt, _img("leather_tone", noncolor=False), uv, -800, 300)
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs["Factor"].default_value = 1.0
    mul.location = (-400, 300)
    nt.links.new(tt.outputs["Color"], _sock(mul.inputs, "A_Color"))
    _sock(mul.inputs, "B_Color").default_value = (*st["leather"], 1.0)
    nt.links.new(_sock(mul.outputs, "Result_Color"), p.inputs["Base Color"])
    tr = _tex(nt, _img("leather_rough"), uv, -800, 0)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    sep.location = (-400, 0)
    nt.links.new(tr.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], p.inputs["Roughness"])
    p.inputs["Metallic"].default_value = 0.0
    _normal(nt, p, _img("leather_normal"), uv, 1.0)
    p.inputs["Sheen Weight"].default_value = 0.4
    p.inputs["Sheen Roughness"].default_value = 0.35
    mats[m.name] = m

    m, nt, p = _new("m_stitch")
    p.inputs["Base Color"].default_value = (*st["stitch"], 1.0)
    p.inputs["Metallic"].default_value = 0.0
    p.inputs["Roughness"].default_value = 0.68
    p.inputs["Sheen Weight"].default_value = 0.5
    mats[m.name] = m
    return mats


def apply_finish(finish):
    """Swap case-metal parameters in place (used for QC2 finish renders)."""
    fin = FINISHES[finish]
    for name, key, rk, extra in (("m_steel_polished", "polished", "rough_p", 0.0),
                                 ("m_steel_brushed", "brushed", "rough_b", 0.0),
                                 ("m_engraving_area", "brushed", "rough_b", 0.02)):
        m = bpy.data.materials.get(name)
        p = m.node_tree.nodes.get("Principled BSDF")
        p.inputs["Base Color"].default_value = (*fin[key], 1.0)
        p.inputs["Roughness"].default_value = fin[rk] + extra


def apply_strap(strap):
    st = STRAPS[strap]
    m = bpy.data.materials.get("m_leather")
    for n in m.node_tree.nodes:
        if n.bl_idname == "ShaderNodeMix":
            _sock(n.inputs, "B_Color").default_value = (*st["leather"], 1.0)
    m2 = bpy.data.materials.get("m_stitch")
    m2.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (*st["stitch"], 1.0)
