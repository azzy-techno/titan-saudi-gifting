# tsg_parts_dial.py -- dial, applied indices, logo plate, hands.
import math
import numpy as np
import bmesh
from mathutils import Matrix

import tsg_geom as G
import tsg_spec as S
import tsg_textures as T


# ----------------------------------------------------------------------------- dial (polar UV)
def build_dial(coll, M):
    r_in = T.DIAL_R_IN
    R = S.DIAL_R
    pts = [(r_in, S.DIAL_Z0), (R, S.DIAL_Z0), (R, S.DIAL_Z1 - 0.06), (R - 0.07, S.DIAL_Z1),
           (12.0, S.DIAL_Z1), (6.0, S.DIAL_Z1), (2.0, S.DIAL_Z1), (r_in, S.DIAL_Z1)]
    prof = G.fillet(pts, [0.03, 0.03, 0.05, 0.05, 0, 0, 0, 0.03], segs=[1, 1, 2, 2, 0, 0, 0, 1], closed=True)

    def uvf(theta, k, r, z, u):
        v = (r - r_in) / (R - r_in)
        return (u, min(max(v, 0.0), 1.0))

    bm = G.new_bm()
    G.revolve(bm, prof, 256, closed=True, uv_fn=uvf)
    return G.finalize_mesh_object("dial", bm, coll, [M["m_dial"]], sharp_angle=40.0)


# ----------------------------------------------------------------------------- indices (faceted hip-roof batons)
def _baton(bm, cx, w, L, h_side, h_top, chamfer=0.05):
    """Faceted baton along +Y centred at (cx, 0), base z=0."""
    hw = w / 2.0
    hl = L / 2.0
    c = chamfer
    base = [(-hw + c, -hl), (hw - c, -hl), (hw, -hl + c), (hw, hl - c), (hw - c, hl), (-hw + c, hl),
            (-hw, hl - c), (-hw, -hl + c)]
    vb = [bm.verts.new((cx + x, y, 0.0)) for x, y in base]
    vs = [bm.verts.new((cx + x, y, h_side)) for x, y in base]
    e = hw * 0.95
    r0 = bm.verts.new((cx, -hl + e, h_top))
    r1 = bm.verts.new((cx, hl - e, h_top))
    n = len(base)
    bm.faces.new(vb[::-1])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((vb[i], vb[j], vs[j], vs[i]))
    # roof facets
    bm.faces.new((vs[0], vs[1], r0))                 # bottom end
    bm.faces.new((vs[1], vs[2], r0))
    bm.faces.new((vs[2], vs[3], r1, r0))             # right long facet
    bm.faces.new((vs[3], vs[4], r1))
    bm.faces.new((vs[4], vs[5], r1))                 # top end
    bm.faces.new((vs[5], vs[6], r1))
    bm.faces.new((vs[6], vs[7], r0, r1))             # left long facet
    bm.faces.new((vs[7], vs[0], r0))


def build_indices(coll, M):
    obs = []
    L = S.INDEX_R1 - S.INDEX_R0
    rmid = 0.5 * (S.INDEX_R0 + S.INDEX_R1)
    for h in range(1, 13):
        bm = G.new_bm()
        if h == 12:
            _baton(bm, -0.46, 0.64, L, 0.30, S.INDEX_H)
            _baton(bm, 0.46, 0.64, L, 0.30, S.INDEX_H)
        else:
            _baton(bm, 0.0, S.INDEX_W, L, 0.30, S.INDEX_H)
        theta = math.radians(90.0 - 30.0 * h)
        loc = (rmid * math.cos(theta), rmid * math.sin(theta), 0.0)
        ob = G.finalize_mesh_object("index_%02d" % h, bm, coll, [M["m_steel_polished"]], location=loc,
                                    rotation=(0.0, 0.0, theta - math.pi / 2), sharp_angle=15.0, weighted=False)
        obs.append(ob)
    return obs


# ----------------------------------------------------------------------------- logo decal
def build_logo_plate(coll, M, logo_px=(415, 268)):
    w = S.LOGO_W
    h = w * logo_px[1] / logo_px[0]
    bm = G.new_bm()
    uvl = bm.loops.layers.uv.verify()
    z = 0.006
    vs = [bm.verts.new((-w / 2, -h / 2, z)), bm.verts.new((w / 2, -h / 2, z)),
          bm.verts.new((w / 2, h / 2, z)), bm.verts.new((-w / 2, h / 2, z))]
    f = bm.faces.new(vs)
    for loop, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop[uvl].uv = uv
    return G.finalize_mesh_object("logo_plate", bm, coll, [M["m_logo"]], location=(0.0, S.LOGO_CY, 0.0),
                                  sharp_angle=None, weighted=False)


# ----------------------------------------------------------------------------- hands
def _leaf_polygon(L, y0, w0, wmax, tmax=0.55, n=60):
    left = []
    right = []
    for i in range(n + 1):
        t = i / n
        y = y0 + (L - y0) * t
        if t <= tmax:
            ww = w0 + (wmax - w0) * math.sin(0.5 * math.pi * t / tmax)
        else:
            q = (t - tmax) / (1 - tmax)
            ww = wmax * max(math.cos(0.5 * math.pi * q), 0.0) ** 0.85
        right.append((ww / 2, y))
        left.append((-ww / 2, y))
    return right + left[::-1][:-1]


def _lancet_bm(L, wmax, hub_r, hole_r, thick, z, lume=True, mat_metal=0, mat_lume=1):
    y0 = 2.0
    w0 = 0.60
    poly = _leaf_polygon(L, y0 - 0.4, w0, wmax)
    facet = 0.22

    def body_fn(X, Y):
        leaf = G.sd_polygon(X, Y, poly)
        neck = G.sd_box(X, Y, (0, y0 * 0.5), (w0 / 2, y0 * 0.5 + 0.2))
        hub = G.sd_circle(X, Y, (0, 0), hub_r)
        b = G.smin(G.smin(leaf, neck, 0.12), hub, 0.35)
        if hole_r > 0:
            b = np.maximum(b, -G.sd_circle(X, Y, (0, 0), hole_r))
        return b

    def lume_fn(X, Y):
        leaf = G.sd_polygon(X, Y, poly)
        return G.smax(G.smax(leaf + facet + 0.035, 3.0 - Y, 0.25), Y - (L - 1.15), 0.25)

    grid = G.Grid(-1.6, 1.6, -1.6, L + 0.3, 0.006)
    loops = G.sdf_to_loops(body_fn(grid.X, grid.Y), grid, tol=0.0008, max_len=0.12)
    zb = z - thick / 2
    zt = z + thick / 2
    bm = G.new_bm()
    lume_loops = G.sdf_to_loops(lume_fn(grid.X, grid.Y), grid, tol=0.0008, max_len=0.12) if lume else []
    prof = [(0.0, zb), (0.0, zt - 0.055), (facet, zt)]
    res = G.sweep(bm, loops, prof, mat_wall=mat_metal, mat_top=mat_metal, mat_bottom=mat_metal,
                  extra_top=[Lp[::-1].copy() for Lp in lume_loops], sdf_fn=body_fn)
    for li, Lp in enumerate(lume_loops):
        # pocket wall (faces into the pocket), welded to the cap's hole ring, + recessed lume insert
        r2 = G.sweep(bm, [Lp[::-1].copy()], [(0.0, zt - 0.05), (0.0, zt)], cap_top=False, cap_bottom=False,
                     mat_wall=mat_metal)
        G.weld_rings(bm, res["extra_top"][li], r2["rings"][0][-1], max_dist=1e-4)
        G.sweep(bm, [Lp], [(0.0, zt - 0.09), (0.0, zt - 0.035)], mat_wall=mat_lume, mat_top=mat_lume,
                mat_bottom=mat_lume)
    return bm


def _pipe(bm, r_out, r_in, z0, z1, mat=0):
    pts = [(r_in, z0), (r_out, z0), (r_out, z1), (r_in, z1)]
    prof = G.fillet(pts, [0.0, 0.0, 0.04, 0.0], segs=[0, 0, 2, 0], closed=True)
    faces, _ = G.revolve(bm, prof, 40, closed=True, mat_fn=lambda k: mat)


def build_hands(coll, M):
    obs = []
    # hour
    z = S.HAND_Z["hour"]
    bm = _lancet_bm(S.HAND_LEN["hour"], 1.70, 1.18, 0.70, 0.14, 0.0)
    b2 = G.new_bm()
    _pipe(b2, 0.95, 0.70, -z + 0.02, -0.06)
    G.bm_add(bm, b2)
    b2.free()
    obs.append(G.finalize_mesh_object("hand_hour", bm, coll, [M["m_steel_polished"], M["m_lume"]],
                                      location=(0, 0, z), sharp_angle=30.0))
    # minute
    z = S.HAND_Z["minute"]
    bm = _lancet_bm(S.HAND_LEN["minute"], 1.42, 0.92, 0.36, 0.13, 0.0)
    b2 = G.new_bm()
    _pipe(b2, 0.62, 0.36, -z + 0.03, -0.06)
    G.bm_add(bm, b2)
    b2.free()
    obs.append(G.finalize_mesh_object("hand_minute", bm, coll, [M["m_steel_polished"], M["m_lume"]],
                                      location=(0, 0, z), sharp_angle=30.0))
    # seconds: needle + counterweight + cap (champagne lacquer)
    z = S.HAND_Z["seconds"]
    Ls = S.HAND_LEN["seconds"]
    grid = G.Grid(-1.0, 1.0, -S.SECONDS_TAIL - 0.3, Ls + 0.3, 0.004)

    def sec_fn(X, Y):
        needle = G.sd_uneven_capsule(X, Y, (0, -2.6), (0, Ls - 0.06), 0.21, 0.06)
        cw = G.sd_circle(X, Y, (0, -S.SECONDS_TAIL + 0.62), 0.62)
        hub = G.sd_circle(X, Y, (0, 0), 0.62)
        b = G.smin(G.smin(needle, cw, 0.25), hub, 0.3)
        return np.maximum(b, -G.sd_circle(X, Y, (0, -S.SECONDS_TAIL + 0.62), 0.30))

    loops = G.sdf_to_loops(sec_fn(grid.X, grid.Y), grid, tol=0.0006, max_len=0.1)
    bm = G.new_bm()
    t = 0.10
    G.sweep(bm, loops, [(0.0, -t / 2), (0.0, t / 2 - 0.035), (0.07, t / 2)], sdf_fn=sec_fn)
    b2 = G.new_bm()
    cap = [(0.0, t / 2), (0.50, t / 2), (0.50, t / 2 + 0.16), (0.30, t / 2 + 0.24), (0.0, t / 2 + 0.26)]
    G.revolve(b2, G.fillet(cap, [0, 0.0, 0.06, 0.12, 0], segs=[0, 0, 2, 3, 0]), 40)
    _pipe(b2, 0.30, 0.12, -z + 0.03, -t / 2 + 0.01)
    G.bm_add(bm, b2)
    b2.free()
    obs.append(G.finalize_mesh_object("hand_seconds", bm, coll, [M["m_accent"]], location=(0, 0, z),
                                      sharp_angle=30.0))
    return obs
