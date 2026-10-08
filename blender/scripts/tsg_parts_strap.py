# tsg_parts_strap.py -- strap_a (12 o'clock, buckle side, keepers), strap_b (6 o'clock, 7 holes), buckle.
# The straps curve backwards (-Z) like a product shot on an invisible wrist.
import math
import numpy as np
import bpy
import bmesh
from mathutils import Matrix, Vector

import tsg_geom as G
import tsg_spec as S

Y0 = 20.75          # strap end next to the case
Z0 = -1.00          # strap centreline height at the lugs
BAR = (22.0, -0.95)  # spring bar (y, z)
LEN_A = 64.0
LEN_B = 102.0
PSI0 = math.radians(11.0)


def centerline(L, side, R_start=21.5, R_end=None, s1=3.0, s2=13.0, ds=0.7):
    """Returns arrays s, P(n,3), T(n,3), N(n,3). side=+1 (strap_a, +Y) or -1 (strap_b)."""
    R_end = R_end or R_start
    n = int(math.ceil(L / ds)) + 1
    s = np.linspace(0.0, L, n)
    kmax_s = 1.0 / R_start
    k = np.zeros(n)
    for i, si in enumerate(s):
        if si < s1:
            ki = 0.0
        elif si < s2:
            ki = kmax_s * (si - s1) / (s2 - s1)
        else:
            t = (si - s2) / max(L - s2, 1e-6)
            Rr = R_start + (R_end - R_start) * t ** 1.4
            ki = 1.0 / Rr
        k[i] = ki
    psi = PSI0 + np.concatenate([[0.0], np.cumsum(0.5 * (k[1:] + k[:-1]) * np.diff(s))])
    ty = np.cos(psi) * side
    tz = -np.sin(psi)
    y = Y0 * side + np.concatenate([[0.0], np.cumsum(0.5 * (ty[1:] + ty[:-1]) * np.diff(s))])
    z = Z0 + np.concatenate([[0.0], np.cumsum(0.5 * (tz[1:] + tz[:-1]) * np.diff(s))])
    P = np.stack([np.zeros(n), y, z], 1)
    T = np.stack([np.zeros(n), ty, tz], 1)
    N = np.stack([np.zeros(n), np.sin(psi) * side, np.cos(psi)], 1)
    return s, P, T, N


def width_at(s, L, tail=False):
    w = S.STRAP_W0 + (S.STRAP_W1 - S.STRAP_W0) * min(s / (0.72 * L), 1.0)
    if tail:
        tip = 9.0
        if s > L - tip:
            q = (s - (L - tip)) / tip
            w *= max(math.sqrt(max(1.0 - q * q, 0.0)), 0.16)
    return w


def thick_at(s, L):
    t = 2.25 + 1.05 * math.exp(-s / 7.0)
    if s > L - 3.0:
        t *= 0.92
    return t


def section(w, t, n_top=14, n_edge=6, n_bot=8):
    """Closed section in (b, n): padded domed top, rounded edges, flat bottom. CCW in (b,n)."""
    te = 0.62 * t
    re = te / 2.0
    bmax = w / 2.0 - re
    pts = []
    # bottom (left -> right)
    for i in range(n_bot + 1):
        b = -bmax + 2 * bmax * i / n_bot
        pts.append((b, -t / 2))
    # right edge (bottom -> top), semicircle of radius re centred at (bmax, -t/2 + re)
    cz = -t / 2 + re
    for i in range(1, n_edge):
        a = -math.pi / 2 + math.pi * i / n_edge
        pts.append((bmax + re * math.cos(a), cz + re * math.sin(a)))
    # top (right -> left), padded dome
    for i in range(n_top + 1):
        b = bmax - 2 * bmax * i / n_top
        q = abs(b) / (w / 2.0)
        nn = -t / 2 + te + (t - te) * (1.0 - q ** 3.2)
        pts.append((b, nn))
    # left edge (top -> bottom)
    for i in range(1, n_edge):
        a = math.pi / 2 + math.pi * i / n_edge
        pts.append((-bmax + re * math.cos(a), cz + re * math.sin(a)))
    return pts


def top_n(b, w, t):
    te = 0.62 * t
    q = min(abs(b) / (w / 2.0), 1.0)
    return -t / 2 + te + (t - te) * (1.0 - q ** 3.2)


def _strap_bm(L, side, tail, R_start, R_end, mat_leather=0, mat_stitch=1):
    s, P, T, N = centerline(L, side, R_start, R_end)
    Bv = np.array([1.0, 0.0, 0.0])
    bm = G.new_bm()
    uvl = bm.loops.layers.uv.verify()
    rings = []
    secs = []
    for i in range(len(s)):
        w = width_at(s[i], L, tail)
        t = thick_at(s[i], L)
        sec = section(w, t)
        secs.append(sec)
        ring = []
        for (b, nn) in sec:
            co = P[i] + Bv * b + N[i] * nn
            ring.append(bm.verts.new(co))
        rings.append(ring)
    m = len(rings[0])
    for i in range(len(rings) - 1):
        a, c = rings[i], rings[i + 1]
        for j in range(m):
            j2 = (j + 1) % m
            # orientation: section CCW in (b, n) and T = n x b direction ...
            f = bm.faces.new((a[j], c[j], c[j2], a[j2]))
            f.smooth = True
            f.material_index = mat_leather
            for loop, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j2), (i, j2))):
                b, nn = secs[ii][jj]
                loop[uvl].uv = (b / 8.0 + 0.5, s[ii] / 8.0)
    f0 = bm.faces.new(rings[0])
    f1 = bm.faces.new(rings[-1][::-1])
    for f in (f0, f1):
        f.material_index = mat_leather
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm, (s, P, T, N)


def _stitches(bm, frame, L, tail, s_from, s_to, mat=1, pitch=1.65, length=1.12, width=0.40, height=0.17, slant=12.0):
    s, P, T, N = frame
    for side_b in (-1.0, 1.0):
        sv = s_from
        while sv < s_to:
            i = int(np.searchsorted(s, sv))
            i = min(max(i, 1), len(s) - 1)
            f = (sv - s[i - 1]) / (s[i] - s[i - 1])
            p = P[i - 1] * (1 - f) + P[i] * f
            tt = T[i - 1] * (1 - f) + T[i] * f
            nn = N[i - 1] * (1 - f) + N[i] * f
            tt /= np.linalg.norm(tt)
            nn /= np.linalg.norm(nn)
            w = width_at(sv, L, tail)
            t = thick_at(sv, L)
            b = side_b * (w / 2.0 - 1.05)
            if tail and sv > L - 9.5:
                break
            h0 = top_n(b, w, t)
            base = p + np.array([b, 0, 0]) + nn * (h0 - 0.05)
            # local stitch frame: X = along strap (slanted), Y = across, Z = normal
            ang = math.radians(slant) * side_b
            ex = tt * math.cos(ang) + np.array([1.0, 0, 0]) * math.sin(ang)
            ey = np.cross(nn, ex)
            nu, nv = 6, 3
            grid_v = []
            for a in range(nu + 1):
                u = -1 + 2 * a / nu
                row = []
                for c in range(nv + 1):
                    v = -1 + 2 * c / nv
                    r = max(1 - u * u, 0.0) ** 0.5
                    zz = height * max(1 - v * v, 0.0) ** 0.5 * r
                    co = base + ex * (u * length / 2) + ey * (v * width / 2 * r ** 0.6 + 1e-4) + nn * zz
                    row.append(bm.verts.new(co))
                grid_v.append(row)
            for a in range(nu):
                for c in range(nv):
                    fc = bm.faces.new((grid_v[a][c], grid_v[a + 1][c], grid_v[a + 1][c + 1], grid_v[a][c + 1]))
                    fc.smooth = True
                    fc.material_index = mat
            sv += pitch


def _keeper(bm, frame, L, s_at, mat=0, mat_stitch=1, length=5.0, gap=1.45, wall=0.72):
    s, P, T, N = frame
    i = int(np.searchsorted(s, s_at))
    p = P[i]
    tt = T[i]
    nn = N[i]
    w = width_at(s_at, L) + 0.5
    t = thick_at(s_at, L)
    # rounded rectangle ring (inner) in (b, n): b in [-w/2, w/2], n in [-t/2 - 0.2, t/2 + gap]
    def rrect(hw, n0, n1, r, k=5):
        cs = [(hw - r, n1 - r, 0.0), (-hw + r, n1 - r, 90.0), (-hw + r, n0 + r, 180.0), (hw - r, n0 + r, 270.0)]
        out = []
        for (cb, cn, a0) in cs:
            for q in range(k + 1):
                a = math.radians(a0 + 90.0 * q / k)
                out.append((cb + r * math.cos(a), cn + r * math.sin(a)))
        return out
    inner = rrect(w / 2, -t / 2 - 0.15, t / 2 + gap, 0.5)
    outer = rrect(w / 2 + wall, -t / 2 - 0.15 - wall, t / 2 + gap + wall, 0.5 + wall)
    rings = []
    for ds_ in (-length / 2, length / 2):
        c = p + tt * ds_
        ro = [bm.verts.new(c + np.array([b, 0, 0]) + nn * n_) for (b, n_) in outer]
        ri = [bm.verts.new(c + np.array([b, 0, 0]) + nn * n_) for (b, n_) in inner]
        rings.append((ro, ri))
    m = len(outer)
    (o0, i0), (o1, i1) = rings
    kf = []
    for j in range(m):
        j2 = (j + 1) % m
        for quad in ((o0[j], o0[j2], o1[j2], o1[j]), (i0[j2], i0[j], i1[j], i1[j2]),
                     (o0[j2], o0[j], i0[j], i0[j2]), (o1[j], o1[j2], i1[j2], i1[j])):
            f = bm.faces.new(quad)
            f.smooth = True
            f.material_index = mat
            kf.append(f)
    bmesh.ops.recalc_face_normals(bm, faces=kf)


def _spring_bar(bm, mat=2):
    b = G.new_bm()
    G.revolve(b, G.fillet([(0.0, -10.25), (0.62, -10.25), (0.62, 10.25), (0.0, 10.25)], [0, 0.15, 0.15, 0],
                          segs=[0, 2, 2, 0]), 16, mat_fn=lambda k: mat)
    G.transform_bm(b, Matrix.Translation((0, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    return b


def _place_bar(b, side):
    G.transform_bm(b, Matrix.Translation((0.0, BAR[0] * side, BAR[1])))


def _holes(ob, frame, L, coll):
    s, P, T, N = frame
    cutters = []
    for k in range(7):
        sv = L - 50.0 + k * 6.5
        i = int(np.searchsorted(s, sv))
        p = P[i]
        nn = N[i]
        tt = T[i]
        b = G.new_bm()
        G.revolve(b, [(0.0, -3.0), (0.68, -3.0), (0.68, 3.0), (0.0, 3.0)], 18)
        # align local Z with the strap normal
        z = Vector(nn.tolist())
        x = Vector(tt.tolist())
        y = z.cross(x)
        M3 = Matrix((x, y, z)).transposed().to_4x4()
        G.transform_bm(b, Matrix.Translation(Vector(p.tolist())) @ M3)
        me = bpy.data.meshes.new("__hole_%d" % k)
        b.to_mesh(me)
        b.free()
        co = bpy.data.objects.new("__hole_%d" % k, me)
        coll.objects.link(co)
        cutters.append(co)
    # join cutters into one
    hc = bpy.data.collections.new("__holes")
    for c in cutters:
        coll.objects.unlink(c)
        hc.objects.link(c)
    mod = ob.modifiers.new("holes", 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.operand_type = 'COLLECTION'
    mod.collection = hc
    G.apply_modifiers(ob)
    for c in cutters:
        me = c.data
        bpy.data.objects.remove(c, do_unlink=True)
        bpy.data.meshes.remove(me)
    bpy.data.collections.remove(hc)


def build_straps(coll, M):
    mats = [M["m_leather"], M["m_stitch"], M["m_movement_steel"]]
    obs = []
    # strap_a (+Y, 12 o'clock), ends at the buckle, two keepers
    bm, fr = _strap_bm(LEN_A, +1, False, 21.0, 22.0)
    _stitches(bm, fr, LEN_A, False, 2.6, LEN_A - 2.2)
    _keeper(bm, fr, LEN_A, LEN_A - 11.0)
    _keeper(bm, fr, LEN_A, LEN_A - 19.5)
    b = _spring_bar(bm)
    _place_bar(b, +1)
    G.bm_add(bm, b)
    b.free()
    loc = _strap_origin(fr)
    G.transform_bm(bm, Matrix.Translation((-loc[0], -loc[1], -loc[2])))
    oa = G.finalize_mesh_object("strap_a", bm, coll, mats, location=loc, sharp_angle=60.0, weighted=False)
    obs.append(oa)
    # strap_b (-Y, 6 o'clock), 7 holes, rounded tail opening outward
    bm, fr = _strap_bm(LEN_B, -1, True, 21.0, 30.0)
    loc = _strap_origin(fr)
    G.transform_bm(bm, Matrix.Translation((-loc[0], -loc[1], -loc[2])))
    ob_ = G.finalize_mesh_object("strap_b", bm, coll, mats, location=loc, sharp_angle=None, weighted=False)
    _holes(ob_, fr, LEN_B, coll)          # Exact boolean on the closed body (world-space cutters)
    bm = bmesh.new()
    bm.from_mesh(ob_.data)
    s, P, T, N = fr
    fr_local = (s, P - np.array(loc), T, N)
    _stitches(bm, fr_local, LEN_B, True, 2.6, LEN_B)
    b = _spring_bar(bm)
    _place_bar(b, -1)
    G.transform_bm(b, Matrix.Translation((-loc[0], -loc[1], -loc[2])))
    G.bm_add(bm, b)
    b.free()
    bm.to_mesh(ob_.data)
    bm.free()
    ob_.data.set_sharp_from_angle(angle=math.radians(60.0))
    obs.append(ob_)
    STRAP_FRAMES["a"] = centerline(LEN_A, +1, 21.0, 22.0)
    return obs


STRAP_FRAMES = {}


def _strap_origin(fr):
    s, P, T, N = fr
    c = P.mean(axis=0)
    return (0.0, float(c[1]), float(c[2]))


# ----------------------------------------------------------------------------- buckle
def build_buckle(coll, M):
    s, P, T, N = STRAP_FRAMES.get("a") or centerline(LEN_A, +1, 21.0, 22.0)
    pe, te, ne = P[-1], T[-1], N[-1]
    # 2D outline in the buckle plane: u along the strap direction (from the bar), v across (= watch X)
    L_out, W_out = 10.4, 22.4
    grid = G.Grid(-1.6, L_out + 0.6, -W_out / 2 - 0.6, W_out / 2 + 0.6, 0.01)

    def frame_fn(U, V):
        outer = G.sd_box(U, V, (L_out / 2 - 1.0, 0.0), (L_out / 2, W_out / 2), 2.2)
        far = G.sd_circle(U, V, (L_out - 26.0, 0.0), 26.0 + 0.6)       # gently arched far side
        outer = G.smax(outer, far, 1.2)
        inner = G.sd_box(U, V, (L_out / 2 - 0.7, 0.0), (L_out / 2 - 2.35, 18.6 / 2), 1.0)
        return G.smax(outer, -inner, 0.25)

    loops = G.sdf_to_loops(frame_fn(grid.X, grid.Y), grid, tol=0.001, max_len=0.25)
    bm = G.new_bm()
    th = 2.1
    G.sweep(bm, loops, [(0.10, -th / 2), (0.0, -th / 2 + 0.10), (0.0, th / 2 - 0.14), (0.20, th / 2)],
            seg_mats=[0, 0, 0], mat_top=1, mat_bottom=0, sdf_fn=frame_fn,
            cap_uv=lambda x, y, z, up: (y / 10.0, x / 10.0),
            interior_top=G.interior_points(frame_fn, (-1.0, L_out, -W_out / 2, W_out / 2), 0.6, 0.25),
            interior_bottom=G.interior_points(frame_fn, (-1.0, L_out, -W_out / 2, W_out / 2), 0.6, 0.25, seed=7))
    # tongue (pin): tapered rod from the bar to the far side, resting in a notch
    tb = G.new_bm()
    tl = L_out - 0.9
    G.revolve(tb, G.fillet([(0.0, 0.0), (0.62, 0.0), (0.50, tl * 0.55), (0.38, tl), (0.0, tl + 0.1)],
                           [0, 0.2, 0, 0.3, 0], segs=[0, 2, 0, 3, 0]), 16)
    G.transform_bm(tb, Matrix.Translation((-0.4, 0.0, th / 2 + 0.25)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    G.bm_add(bm, tb)
    tb.free()
    # hinge bar (round) along v at u = -0.4 (the strap folds around it)
    hb = G.new_bm()
    G.revolve(hb, G.fillet([(0.0, -9.6), (0.78, -9.6), (0.78, 9.6), (0.0, 9.6)], [0, 0.2, 0.2, 0], segs=[0, 2, 2, 0]),
              20)
    G.transform_bm(hb, Matrix.Translation((-0.4, 0.0, 0.0)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    G.bm_add(bm, hb)
    hb.free()
    # bend along u with the strap curvature (radius about the -N side)
    R = 22.0
    for v in bm.verts:
        u, vv, w = v.co.x, v.co.y, v.co.z
        a = u / R
        rr = R + w
        v.co.x = rr * math.sin(a)
        v.co.z = rr * math.cos(a) - R
    # place: u -> strap tangent, v -> watch X, w -> strap normal; bar sits just past the strap end
    ex = Vector(te.tolist())
    ez = Vector(ne.tolist())
    ey = ez.cross(ex)
    M3 = Matrix((ex, ey, ez)).transposed().to_4x4()
    origin = Vector(pe.tolist()) + ex * 1.0 + ez * 0.25
    G.transform_bm(bm, M3)
    # centre the object origin on its own bounds
    cs = [v.co.copy() for v in bm.verts]
    c = sum(cs, Vector()) / len(cs)
    G.transform_bm(bm, Matrix.Translation(-c))
    return G.finalize_mesh_object("buckle", bm, coll, [M["m_steel_polished"], M["m_steel_brushed"]],
                                  location=tuple(origin + c), sharp_angle=35.0)


BUILDERS = [build_straps, build_buckle]
