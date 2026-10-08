# tsg_parts_case.py -- case_body (integrated lugs), bezel, crystal, crown, crown_tube,
# caseback, caseback screws, gasket.
import math
import numpy as np
import bmesh
from mathutils import Matrix, Vector

import tsg_geom as G
import tsg_spec as S


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# ----------------------------------------------------------------------------- case outline
def case_sdf(X, Y):
    AX = np.abs(X)
    AY = np.abs(Y)
    r = np.hypot(X, Y)
    case = r - S.CASE_R
    ax0, ay0 = S.LUG_ROOT_OUTER_X, 15.0
    ax1, ay1 = S.LUG_TIP_OUTER_X, S.LUG_TIP_Y
    dx, dy = ax1 - ax0, ay1 - ay0
    L = math.hypot(dx, dy)
    nx, ny = dy / L, -dx / L
    d_out = (AX - ax0) * nx + (AY - ay0) * ny
    d_tip = AY - S.LUG_TIP_Y
    d_in = 8.0 - AX
    d_root = 14.0 - AY
    lug = G.smax(G.smax(d_out, d_tip, 1.0), np.maximum(d_in, d_root), 0.0)
    body = G.smin(case, lug, 3.2)
    gap = np.maximum(np.maximum(AX - S.LUG_INNER_X, S.CASE_R - 0.02 - r), 15.0 - AY)
    return G.smax(body, -gap, 0.9)


def lug_f(ay):
    t = np.maximum(ay - 19.0, 0.0)
    return 0.066 * t * t


def lug_g(ay):
    t = np.maximum(ay - 18.0, 0.0) / 6.0
    return 2.5 * t ** 1.6


def bend_lugs(bm, z_top_band=1.0, z_bot_band=S.CASE_BOT_Z + 0.42):
    """Bend the lugs down (top) and thin them toward the tips (bottom)."""
    for v in bm.verts:
        x, y, z = v.co
        ax, ay = abs(x), abs(y)
        w = float(smoothstep(8.6, 10.1, ax))
        if w <= 0.0 or ay <= 18.0:
            continue
        f = float(lug_f(ay)) * w
        g = float(lug_g(ay)) * w
        if z >= z_top_band:
            dz = -f
        elif z <= z_bot_band:
            dz = g
        else:
            t = (z - z_bot_band) / (z_top_band - z_bot_band)
            dz = g * (1 - t) + (-f) * t
        v.co.z = z + dz


def build_case_body(coll, M):
    grid = G.Grid(-22.0, 22.0, -25.5, 25.5, 0.025)
    F = case_sdf(grid.X, grid.Y)
    loops = G.sdf_to_loops(F, grid, tol=0.0012, max_len=0.25)
    outer = max(loops, key=lambda L: abs(G.loop_area(L)))
    top_in = 0.58
    bot_in = 0.62
    pts = [(bot_in, S.CASE_BOT_Z), (0.22, S.CASE_BOT_Z), (0.0, S.CASE_TOP_Z - S.CHAMFER),
           (S.CHAMFER, S.CASE_TOP_Z), (top_in, S.CASE_TOP_Z)]
    prof = G.fillet(pts, [0, 0.36, 0.07, 0.07, 0], segs=[0, 4, 2, 2, 0])
    seg_mats = []
    for k in range(len(prof) - 1):
        zm = 0.5 * (prof[k][1] + prof[k + 1][1])
        polished = zm < S.CASE_BOT_Z + 0.42 or zm > S.CASE_TOP_Z - S.CHAMFER - 0.05
        seg_mats.append(1 if polished else 0)
    r_top_hole = 19.0
    r_bot_hole = 17.6
    nh = 256

    def reg_top(X, Y):
        return np.maximum(case_sdf(X, Y) + top_in, r_top_hole - np.hypot(X, Y))

    def reg_bot(X, Y):
        return np.maximum(case_sdf(X, Y) + bot_in, r_bot_hole - np.hypot(X, Y))

    it = G.interior_points(reg_top, (-14, 14, -25, 25), 0.30, 0.16, seed=3)
    it = it[np.abs(it[:, 1]) > 18.3]
    ib = G.interior_points(reg_bot, (-14, 14, -25, 25), 0.34, 0.18, seed=4)
    ib = ib[np.abs(ib[:, 1]) > 18.0]
    bm = G.new_bm()
    res = G.sweep(bm, [outer], prof, seg_mats=seg_mats, mat_top=0, mat_bottom=0,
                  wall_uv=lambda x, y, z, s, k, li: (s / 10.0, z / 10.0),
                  cap_uv=lambda x, y, z, up: (x / 10.0, y / 10.0),
                  interior_top=it, interior_bottom=ib,
                  extra_top=[G.circle_loop(r_top_hole, nh, ccw=False)],
                  extra_bottom=[G.circle_loop(r_bot_hole, nh, ccw=False)], sdf_fn=case_sdf)
    # inner revolve: top hole -> rehaut -> dial seat -> movement holder -> caseback seat -> bottom hole
    ip = [(r_top_hole, S.CASE_TOP_Z), (r_top_hole, 2.10), (17.45, 2.10), (16.90, 0.05), (16.90, -0.42),
          (15.30, -0.42), (15.30, S.CASE_BOT_Z + 0.40), (r_bot_hole, S.CASE_BOT_Z + 0.40), (r_bot_hole, S.CASE_BOT_Z)]

    def imat(k):
        return 2 if k == 2 else 1

    def iuv(theta, k, r, z, u):
        return (u * 4.0, 0.45)

    faces, rings = G.revolve(bm, ip, nh, mat_fn=imat, uv_fn=iuv)
    G.weld_rings(bm, res["extra_top"][0], rings[0])
    G.weld_rings(bm, res["extra_bottom"][0], rings[-1])
    bend_lugs(bm)
    ob = G.finalize_mesh_object("case_body", bm, coll, [M["m_steel_brushed"], M["m_steel_polished"], M["m_dial"]],
                                sharp_angle=30.0)
    return ob


# ----------------------------------------------------------------------------- bezel
def _bezier(p0, p1, p2, n):
    out = []
    for i in range(n + 1):
        t = i / n
        a = (1 - t) ** 2
        b = 2 * (1 - t) * t
        c = t * t
        out.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))
    return out


def build_bezel(coll, M):
    top = _bezier((19.20, S.BEZEL_TOP_Z), (18.30, 3.235), (17.55, 3.12), 8)
    pts = [(S.BEZEL_R_IN, S.CASE_TOP_Z), (S.BEZEL_R_OUT, S.CASE_TOP_Z), (S.BEZEL_R_OUT, 3.08)] + top + [(S.BEZEL_R_IN, 3.00)]
    rad = [0.04, 0.05, 0.30] + [0.10] + [0.0] * (len(top) - 2) + [0.08, 0.04]
    segs = [2, 2, 5] + [3] + [0] * (len(top) - 2) + [3, 2]
    prof = G.fillet(pts, rad, segs=segs, closed=True)
    bm = G.new_bm()
    G.revolve(bm, prof, 192, closed=True)
    return G.finalize_mesh_object("bezel", bm, coll, [M["m_steel_polished"]], sharp_angle=40.0)


# ----------------------------------------------------------------------------- crystal
def _sphere_arc(r_edge, z_edge, z_apex, n, outward=True):
    sag = z_apex - z_edge
    R = (r_edge ** 2 + sag ** 2) / (2 * abs(sag))
    zc = z_apex - math.copysign(R, sag)
    pts = []
    for i in range(n + 1):
        r = r_edge * i / n
        z = zc + math.copysign(math.sqrt(R * R - r * r), sag)
        pts.append((r, z))
    return pts if outward else pts[::-1]


def build_crystal(coll, M):
    rc = S.CRYSTAL_R
    under = _sphere_arc(rc - 0.08, S.CRYSTAL_BOT_EDGE + 0.004, S.CRYSTAL_BOT_APEX, 6, outward=True)
    under[-1] = (rc - 0.08, S.CRYSTAL_BOT_EDGE)
    topa = _sphere_arc(rc - 0.16, S.CRYSTAL_EDGE_TOP, S.CRYSTAL_APEX, 7, outward=False)
    pts = under + [(rc, S.CRYSTAL_BOT_EDGE + 0.06), (rc, S.CRYSTAL_EDGE_TOP - 0.15)] + topa
    rad = [0] * len(under)
    rad[-1] = 0.05
    rad += [0.04, 0.14] + [0] * len(topa)
    rad[len(under) + 2] = 0.06
    segs = [2] * len(pts)
    prof = G.fillet(pts, rad, segs=segs)
    bm = G.new_bm()
    G.revolve(bm, prof, 192)
    return G.finalize_mesh_object("crystal", bm, coll, [M["m_sapphire"]], sharp_angle=35.0,
                                  location=(0.0, 0.0, 0.0))


# ----------------------------------------------------------------------------- crown + tube (axis = +X)
CROWN_X0 = 21.05      # inner face of the crown (watch X)
CROWN_LEN = 3.22


def _x_axis_matrix(x_origin):
    # local +Z -> watch +X ; local +X -> watch -Z ; local +Y -> watch +Y
    return Matrix(((0, 0, 1, 0), (0, 1, 0, 0), (-1, 0, 0, 0), (0, 0, 0, 1)))


def build_crown(coll, M):
    flank = [(3.00, z) for z in (0.30, 0.44, 0.60, 0.95, 1.40, 1.85, 2.20, 2.42, 2.58)]
    pts = [(0.0, 1.20), (1.40, 1.20), (1.40, 0.0), (2.70, 0.0)] + flank + [(2.55, 3.00), (1.30, 3.17), (0.0, 3.22)]
    rad = [0, 0.05, 0.08, 0.10] + [0.12] + [0] * (len(flank) - 2) + [0.12] + [0.16, 0.6, 0]
    segs = [0, 2, 2, 2] + [3] + [0] * (len(flank) - 2) + [3] + [3, 3, 0]
    prof = G.fillet(pts, rad, segs=segs)

    def rfn(th, k, r, z):
        if r < 2.9:
            return r
        fade = float(smoothstep(0.36, 0.62, z) * (1.0 - smoothstep(2.34, 2.56, z)))
        ph = (th * 24.0 / G.TAU) % 1.0
        g = math.sin(math.pi * min(max((ph - 0.22) / 0.56, 0.0), 1.0)) ** 1.3
        return r - 0.21 * g * fade

    bm = G.new_bm()
    G.revolve(bm, prof, 24 * 8, radius_fn=rfn)
    # centre the part on its axis mid-length
    G.transform_bm(bm, Matrix.Translation((0, 0, -CROWN_LEN / 2)))
    G.transform_bm(bm, _x_axis_matrix(0))
    loc = (CROWN_X0 + CROWN_LEN / 2, 0.0, S.CROWN_Z)
    return G.finalize_mesh_object("crown", bm, coll, [M["m_steel_polished"]], location=loc, sharp_angle=50.0)


def build_crown_tube(coll, M):
    L = 2.5
    pts = [(0.0, 0.0), (1.22, 0.0), (1.22, L), (0.0, L)]
    prof = G.fillet(pts, [0, 0.06, 0.10, 0], segs=[0, 2, 3, 0])
    bm = G.new_bm()
    G.revolve(bm, prof, 64)
    G.transform_bm(bm, Matrix.Translation((0, 0, -L / 2)))
    G.transform_bm(bm, _x_axis_matrix(0))
    loc = (19.85 + L / 2, 0.0, S.CROWN_Z)
    return G.finalize_mesh_object("crown_tube", bm, coll, [M["m_steel_polished"]], location=loc, sharp_angle=40.0)


# ----------------------------------------------------------------------------- caseback
def build_caseback(coll, M):
    z0 = S.CASEBACK_FACE_Z
    zc = S.CASE_BOT_Z
    pts = [(0.0, z0), (12.86, z0), (13.14, -6.52), (13.55, -6.47), (13.78, -6.31), (15.2, -6.24),
           (16.6, -6.14), (17.50, -5.95), (18.55, -5.20), (18.60, zc), (17.55, zc), (17.55, zc + 0.35),
           (15.35, zc + 0.35), (15.35, -5.05), (0.0, -5.05)]
    rad = [0, 0.05, 0.05, 0.03, 0.05, 0, 0.8, 0.9, 0.25, 0.05, 0.05, 0.05, 0.05, 0.08, 0]
    segs = [0, 2, 2, 1, 2, 0, 3, 5, 3, 1, 1, 1, 1, 2, 0]
    prof = G.fillet(pts, rad, segs=segs)

    def mfn(k):
        return 1 if k == 0 else 0

    def uvf(theta, k, r, z, u):
        return (r * math.cos(theta) / 26.0 + 0.5, r * math.sin(theta) / 26.0 + 0.5)

    bm = G.new_bm()
    G.revolve(bm, prof, 192, mat_fn=mfn, uv_fn=uvf)
    loc = (0.0, 0.0, -5.9)
    G.transform_bm(bm, Matrix.Translation((0, 0, -loc[2])))
    return G.finalize_mesh_object("caseback", bm, coll, [M["m_steel_polished"], M["m_engraving_area"]],
                                  location=loc, sharp_angle=30.0)


def caseback_surface_z(r):
    """Height of the caseback outer ring under a screw (approx)."""
    return -6.24 + (r - 15.2) * (0.10 / 1.4)


def _screw_bm():
    """Slotted domed screw, head facing -Z, origin at the head's seat centre."""
    bm = G.new_bm()
    # shank (+Z, into the caseback); profile walks seat -> tip with the material on the left
    G.revolve(bm, [(0.0, 0.02), (0.50, 0.02), (0.50, 1.00), (0.42, 1.10), (0.0, 1.10)], 24)
    # head: two D-halves + base disc, domed
    grid = G.Grid(-1.0, 1.0, -1.0, 1.0, 0.005)
    X, Y = grid.X, grid.Y
    disc = G.sd_circle(X, Y, (0, 0), 0.86)
    halves = np.maximum(disc, -(np.abs(X) - 0.085))
    loops_h = G.sdf_to_loops(halves, grid, tol=0.0008, max_len=0.06)
    loops_d = G.sdf_to_loops(disc, grid, tol=0.0008, max_len=0.06)
    # base disc: z 0 -> -0.16 (head grows toward -Z); build with +z then mirror
    b2 = G.new_bm()
    G.sweep(b2, loops_d, [(0.0, 0.0), (0.0, 0.14), (0.03, 0.17)])
    G.sweep(b2, loops_h, [(0.0, 0.12), (0.0, 0.30), (0.05, 0.36)],
            interior_top=G.interior_points(lambda X, Y: halves_fn(X, Y), (-0.9, 0.9, -0.9, 0.9), 0.12, 0.05))
    # dome the top of the halves
    for v in b2.verts:
        if v.co.z > 0.2:
            rr = math.hypot(v.co.x, v.co.y)
            v.co.z += 0.10 * (1.0 - (rr / 0.86) ** 2)
    G.transform_bm(b2, Matrix.Scale(-1.0, 4, (0, 0, 1)))  # head toward -Z
    bmesh.ops.reverse_faces(b2, faces=b2.faces)
    G.bm_add(bm, b2)
    b2.free()
    return bm


def halves_fn(X, Y):
    disc = np.hypot(X, Y) - 0.86
    return np.maximum(disc, -(np.abs(X) - 0.085))


def build_caseback_screws(coll, M):
    obs = []
    for i, ang in enumerate(S.CB_SCREW_ANGLES):
        bm = _screw_bm()
        a = math.radians(ang)
        r = S.CB_SCREW_R
        z = caseback_surface_z(r) - 0.01
        rot = (0.0, 0.0, a + math.pi / 2)
        ob = G.finalize_mesh_object("caseback_screw_%02d" % (i + 1), bm, coll, [M["m_steel_polished"]],
                                    location=(r * math.cos(a), r * math.sin(a), z), rotation=rot, sharp_angle=35.0)
        obs.append(ob)
    return obs


def build_gasket(coll, M):
    rc, zc, rr = 17.43, S.CASE_BOT_Z + 0.17, 0.16
    n = 12
    prof = [(rc + rr * math.cos(G.TAU * i / n), zc + rr * math.sin(G.TAU * i / n)) for i in range(n)]
    bm = G.new_bm()
    G.revolve(bm, prof, 160, closed=True)
    return G.finalize_mesh_object("gasket", bm, coll, [M["m_rubber"]], location=(0, 0, 0), sharp_angle=None,
                                  weighted=False)
