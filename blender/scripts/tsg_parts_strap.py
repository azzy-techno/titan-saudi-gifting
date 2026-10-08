# tsg_parts_strap.py -- strap_a (12 o'clock, buckle side, keepers), strap_b (6 o'clock, 7 holes), buckle.
# Product-shot configuration: a closed, buckled loop on an invisible elliptical wrist (opens backwards, -Z).
# strap_b's tail passes through the buckle frame and both keepers, lying on top of strap_a.
import math
import numpy as np
import bpy
import bmesh
from mathutils import Matrix, Vector

import tsg_geom as G
import tsg_spec as S

Y0 = 20.75           # strap end next to the case
Z0 = -1.00           # strap centreline height at the lugs
BAR = (22.0, -0.95)  # spring bar (y, z)
PSI0 = math.radians(11.0)
LOOP_Y = 31.0        # half-width of the wrist loop (y)
LOOP_ZMID = -19.0    # height of the widest point
LOOP_ZBOT = -46.0    # bottom of the loop (centreline)
BUCKLE_BACK = 4.0    # strap_a ends this far before the loop bottom (bar position)
TAIL_PAST = 38.0     # strap_b continues this far past the loop bottom (on top of strap_a)
DS = 0.85


def _bez(p0, p1, p2, p3, n):
    t = np.linspace(0.0, 1.0, n)[:, None]
    return ((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * (t ** 2) * p2 + (t ** 3) * p3


def right_half(ds=DS):
    """Right half of the loop (y>0) from the 12 o'clock lug to the loop bottom, in (y, z)."""
    P0 = np.array([Y0, Z0])
    t0 = np.array([math.cos(PSI0), -math.sin(PSI0)])
    P3 = np.array([LOOP_Y, LOOP_ZMID])
    P6 = np.array([0.0, LOOP_ZBOT])
    b1 = _bez(P0, P0 + t0 * 8.0, P3 + np.array([0.0, 9.0]), P3, 400)
    b2 = _bez(P3, P3 + np.array([0.0, -0.552 * (LOOP_ZMID - LOOP_ZBOT)]), P6 + np.array([0.552 * LOOP_Y, 0.0]), P6, 600)
    pts = np.vstack([b1, b2[1:]])
    seg = np.hypot(*(np.diff(pts, axis=0).T))
    s = np.concatenate([[0.0], np.cumsum(seg)])
    H = s[-1]
    n = int(math.ceil(H / ds)) + 1
    su = np.linspace(0.0, H, n)
    y = np.interp(su, s, pts[:, 0])
    z = np.interp(su, s, pts[:, 1])
    P = np.stack([np.zeros(n), y, z], 1)
    T = np.gradient(P, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    T[0] = np.array([0.0, t0[0], t0[1]])
    N = np.stack([np.zeros(n), -T[:, 2], T[:, 1]], 1)      # outward (away from the wrist)
    return su, P, T, N, H


def frame_a():
    s, P, T, N, H = right_half()
    L = H - BUCKLE_BACK
    m = s <= L + 1e-9
    return s[m], P[m], T[m], N[m], L, H


def delta_ab():
    return 0.5 * (thick_at(60.0, 60.0) + thick_at(60.0, 100.0)) + 0.14


def frame_b():
    s, P, T, N, H = right_half()
    D = delta_ab()
    L = H + TAIL_PAST
    n = int(math.ceil(L / DS)) + 1
    u = np.linspace(0.0, L, n)
    Pb = np.zeros((n, 3))
    Tb = np.zeros((n, 3))
    Nb = np.zeros((n, 3))
    mir = np.array([1.0, -1.0, 1.0])
    for i, ui in enumerate(u):
        if ui <= H:
            k = ui
            p = np.array([np.interp(k, s, P[:, j]) for j in range(3)]) * mir
            t = np.array([np.interp(k, s, T[:, j]) for j in range(3)]) * mir
            nn = np.array([np.interp(k, s, N[:, j]) for j in range(3)]) * mir
        else:
            k = 2 * H - ui
            p = np.array([np.interp(k, s, P[:, j]) for j in range(3)])
            t = -np.array([np.interp(k, s, T[:, j]) for j in range(3)])
            nn = np.array([np.interp(k, s, N[:, j]) for j in range(3)])
        t /= np.linalg.norm(t)
        nn /= np.linalg.norm(nn)
        e = min(max((ui - (H - 24.0)) / 22.0, 0.0), 1.0)
        off = D * e * e * (3 - 2 * e)
        Pb[i] = p + nn * off
        Tb[i] = t
        Nb[i] = nn
    return u, Pb, Tb, Nb, L, H


def width_at(s, L, tail=False):
    w = S.STRAP_W0 + (S.STRAP_W1 - S.STRAP_W0) * min(s / 52.0, 1.0)
    if tail:
        tip = 9.0
        if s > L - tip:
            q = (s - (L - tip)) / tip
            w *= max(math.sqrt(max(1.0 - q * q, 0.0)), 0.16)
    return w


def thick_at(s, L):
    t = 2.20 + 1.10 * math.exp(-s / 7.0)
    if s > L - 3.0:
        t *= 0.92
    return t


def section(w, t, n_top=12, n_edge=5, n_bot=6):
    """Closed section in (b, n): padded domed top, rounded edges, flat bottom."""
    te = 0.62 * t
    re = te / 2.0
    bmax = w / 2.0 - re
    pts = []
    for i in range(n_bot + 1):
        b = -bmax + 2 * bmax * i / n_bot
        pts.append((b, -t / 2))
    cz = -t / 2 + re
    for i in range(1, n_edge):
        a = -math.pi / 2 + math.pi * i / n_edge
        pts.append((bmax + re * math.cos(a), cz + re * math.sin(a)))
    for i in range(n_top + 1):
        b = bmax - 2 * bmax * i / n_top
        q = abs(b) / (w / 2.0)
        nn = -t / 2 + te + (t - te) * (1.0 - q ** 3.2)
        pts.append((b, nn))
    for i in range(1, n_edge):
        a = math.pi / 2 + math.pi * i / n_edge
        pts.append((-bmax + re * math.cos(a), cz + re * math.sin(a)))
    return pts


def top_n(b, w, t):
    te = 0.62 * t
    q = min(abs(b) / (w / 2.0), 1.0)
    return -t / 2 + te + (t - te) * (1.0 - q ** 3.2)


def _strap_bm(frame, L, tail, mat_leather=0):
    s, P, T, N = frame[:4]
    Bv = np.array([1.0, 0.0, 0.0])
    bm = G.new_bm()
    uvl = bm.loops.layers.uv.verify()
    rings = []
    secs = []
    for i in range(len(s)):
        sec = section(width_at(s[i], L, tail), thick_at(s[i], L))
        secs.append(sec)
        rings.append([bm.verts.new(P[i] + Bv * b + N[i] * nn) for (b, nn) in sec])
    m = len(rings[0])
    for i in range(len(rings) - 1):
        a, c = rings[i], rings[i + 1]
        for j in range(m):
            j2 = (j + 1) % m
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
    return bm


def _interp_frame(frame, sv):
    s, P, T, N = frame[:4]
    i = int(np.searchsorted(s, sv))
    i = min(max(i, 1), len(s) - 1)
    f = (sv - s[i - 1]) / (s[i] - s[i - 1])
    p = P[i - 1] * (1 - f) + P[i] * f
    tt = T[i - 1] * (1 - f) + T[i] * f
    nn = N[i - 1] * (1 - f) + N[i] * f
    return p, tt / np.linalg.norm(tt), nn / np.linalg.norm(nn)


def _stitches(bm, frame, L, tail, s_from, s_to, mat=1, pitch=1.65, length=1.12, width=0.40, height=0.17, slant=12.0,
              skip=None):
    for side_b in (-1.0, 1.0):
        sv = s_from
        while sv < s_to:
            if tail and sv > L - 9.5:
                break
            if skip and any(a <= sv <= b for a, b in skip):
                sv += pitch
                continue
            p, tt, nn = _interp_frame(frame, sv)
            w = width_at(sv, L, tail)
            t = thick_at(sv, L)
            b = side_b * (w / 2.0 - 1.05)
            h0 = top_n(b, w, t)
            base = p + np.array([b, 0, 0]) + nn * (h0 - 0.05)
            ang = math.radians(slant) * side_b
            ex = tt * math.cos(ang) + np.array([1.0, 0, 0]) * math.sin(ang)
            ex /= np.linalg.norm(ex)
            ey = np.cross(nn, ex)
            nu, nv = 6, 3
            gv = []
            for a in range(nu + 1):
                u = -1 + 2 * a / nu
                row = []
                for c in range(nv + 1):
                    v = -1 + 2 * c / nv
                    r = max(1 - u * u, 0.0) ** 0.5
                    zz = height * max(1 - v * v, 0.0) ** 0.5 * r
                    row.append(bm.verts.new(base + ex * (u * length / 2) + ey * (v * width / 2 * r ** 0.6 + 1e-4) + nn * zz))
                gv.append(row)
            for a in range(nu):
                for c in range(nv):
                    fc = bm.faces.new((gv[a][c], gv[a + 1][c], gv[a + 1][c + 1], gv[a][c + 1]))
                    fc.smooth = True
                    fc.material_index = mat
            sv += pitch


def _keeper(bm, frame, L, s_at, n_lo, n_hi, mat=0, length=5.0, wall=0.72):
    """Leather loop around strap_a (and strap_b's tail) at s_at; inner span n_lo..n_hi along the normal."""
    p, tt, nn = _interp_frame(frame, s_at)
    w = width_at(s_at, L) + 0.45

    def rrect(hw, n0, n1, r, k=5):
        cs = [(hw - r, n1 - r, 0.0), (-hw + r, n1 - r, 90.0), (-hw + r, n0 + r, 180.0), (hw - r, n0 + r, 270.0)]
        out = []
        for (cb, cn, a0) in cs:
            for q in range(k + 1):
                a = math.radians(a0 + 90.0 * q / k)
                out.append((cb + r * math.cos(a), cn + r * math.sin(a)))
        return out

    inner = rrect(w / 2, n_lo, n_hi, 0.5)
    outer = rrect(w / 2 + wall, n_lo - wall, n_hi + wall, 0.5 + wall)
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


def _spring_bar(side, mat=2):
    b = G.new_bm()
    G.revolve(b, G.fillet([(0.0, -10.25), (0.62, -10.25), (0.62, 10.25), (0.0, 10.25)], [0, 0.15, 0.15, 0],
                          segs=[0, 2, 2, 0]), 16, mat_fn=lambda k: mat)
    G.transform_bm(b, Matrix.Translation((0.0, BAR[0] * side, BAR[1])) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    return b


def hole_positions():
    H = right_half()[4]
    return [H - 7.0 + 6.5 * k for k in range(7)]


def _holes(ob, frame, coll):
    cutters = []
    for k, sv in enumerate(hole_positions()):
        p, tt, nn = _interp_frame(frame, sv)
        b = G.new_bm()
        G.revolve(b, [(0.0, -3.0), (0.68, -3.0), (0.68, 3.0), (0.0, 3.0)], 18)
        z = Vector(nn.tolist())
        x = Vector(tt.tolist())
        y = z.cross(x)
        M3 = Matrix((x, y, z)).transposed().to_4x4()
        G.transform_bm(b, Matrix.Translation(Vector(p.tolist())) @ M3)
        me = bpy.data.meshes.new("__hole_%d" % k)
        b.to_mesh(me)
        b.free()
        cutters.append(bpy.data.objects.new("__hole_%d" % k, me))
    hc = bpy.data.collections.new("__holes")
    for c in cutters:
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


def _origin(P):
    c = P.mean(axis=0)
    return (0.0, float(c[1]), float(c[2]))


def build_straps(coll, M):
    mats = [M["m_leather"], M["m_stitch"], M["m_movement_steel"]]
    obs = []
    D = delta_ab()
    # ---- strap_a: lug -> buckle bar (just before the loop bottom); keepers hold strap_b's tail
    fa = frame_a()
    La = fa[4]
    bm = _strap_bm(fa, La, False)
    keepers = [La - 6.5, La - 14.5]
    _stitches(bm, fa, La, False, 2.6, La - 1.5, skip=[(k - 3.0, k + 3.0) for k in keepers])
    ta = thick_at(La, La)
    tb = thick_at(80.0, 100.0)
    for k in keepers:
        _keeper(bm, fa, La, k, -ta / 2 - 0.12, D + tb / 2 + 0.12)
    b = _spring_bar(+1)
    G.bm_add(bm, b)
    b.free()
    loc = _origin(fa[1])
    G.transform_bm(bm, Matrix.Translation((-loc[0], -loc[1], -loc[2])))
    obs.append(G.finalize_mesh_object("strap_a", bm, coll, mats, location=loc, sharp_angle=60.0, weighted=False))
    # ---- strap_b: lug -> around the loop -> through the buckle + keepers, on top of strap_a; 7 holes
    fb = frame_b()
    Lb = fb[4]
    bm = _strap_bm(fb, Lb, True)
    loc = _origin(fb[1])
    G.transform_bm(bm, Matrix.Translation((-loc[0], -loc[1], -loc[2])))
    ob_ = G.finalize_mesh_object("strap_b", bm, coll, mats, location=loc, sharp_angle=None, weighted=False)
    _holes(ob_, fb, coll)
    bm = bmesh.new()
    bm.from_mesh(ob_.data)
    s, P, T, N = fb[:4]
    fb_local = (s, P - np.array(loc), T, N)
    Hh = fb[5]
    _stitches(bm, fb_local, Lb, True, 2.6, Lb, skip=[(Hh - BUCKLE_BACK - 12.0, Hh + BUCKLE_BACK + 1.5)])
    b = _spring_bar(-1)
    G.transform_bm(b, Matrix.Translation((-loc[0], -loc[1], -loc[2])))
    G.bm_add(bm, b)
    b.free()
    bm.to_mesh(ob_.data)
    bm.free()
    ob_.data.set_sharp_from_angle(angle=math.radians(60.0))
    obs.append(ob_)
    return obs


# ----------------------------------------------------------------------------- buckle
def build_buckle(coll, M):
    s, P, T, N, La, H = frame_a()
    pe, te, ne = P[-1], T[-1], N[-1]
    D = delta_ab()
    L_out, W_out = 10.4, 22.4
    grid = G.Grid(-1.6, L_out + 0.6, -W_out / 2 - 0.6, W_out / 2 + 0.6, 0.01)

    def frame_fn(U, V):
        outer = G.sd_box(U, V, (L_out / 2 - 1.0, 0.0), (L_out / 2, W_out / 2), 2.2)
        far = G.sd_circle(U, V, (L_out - 26.0, 0.0), 26.0 + 0.6)       # gently arched far side
        outer = G.smax(outer, far, 1.2)
        inner = G.sd_box(U, V, (L_out / 2 - 0.7, 0.0), (L_out / 2 - 2.35, 18.6 / 2), 1.0)
        return G.smax(outer, -inner, 0.25)

    loops = G.sdf_to_loops(frame_fn(grid.X, grid.Y), grid, tol=0.001, max_len=0.22)
    bm = G.new_bm()
    th = 2.1
    G.sweep(bm, loops, [(0.10, -th / 2), (0.0, -th / 2 + 0.10), (0.0, th / 2 - 0.14), (0.20, th / 2)],
            seg_mats=[0, 0, 0], mat_top=1, mat_bottom=0, sdf_fn=frame_fn,
            cap_uv=lambda x, y, z, up: (y / 10.0, x / 10.0),
            )
    # tongue (pin): from the hinge over strap_b, tip resting on the far side
    tb = G.new_bm()
    tl = L_out - 0.9
    G.revolve(tb, G.fillet([(0.0, 0.0), (0.62, 0.0), (0.50, tl * 0.55), (0.38, tl), (0.0, tl + 0.1)],
                           [0, 0.2, 0, 0.3, 0], segs=[0, 2, 0, 3, 0]), 16)
    G.transform_bm(tb, Matrix.Translation((-0.4, 0.0, th / 2 + 0.28)) @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
    G.bm_add(bm, tb)
    tb.free()
    hb = G.new_bm()
    G.revolve(hb, G.fillet([(0.0, -9.6), (0.78, -9.6), (0.78, 9.6), (0.0, 9.6)], [0, 0.2, 0.2, 0], segs=[0, 2, 2, 0]), 20)
    G.transform_bm(hb, Matrix.Translation((-0.4, 0.0, 0.0)) @ Matrix.Rotation(math.pi / 2, 4, 'X'))
    G.bm_add(bm, hb)
    hb.free()
    # flat frame (no bend): keeps the polished caps planar; tilt it slightly to follow the loop tangent
    G.transform_bm(bm, Matrix.Rotation(-math.radians(5.0), 4, 'Y'))
    ex = Vector(te.tolist())
    ez = Vector(ne.tolist())
    ey = ez.cross(ex)
    M3 = Matrix((ex, ey, ez)).transposed().to_4x4()
    origin = Vector(pe.tolist()) + ex * 1.0 + ez * D
    G.transform_bm(bm, M3)
    cs = [v.co.copy() for v in bm.verts]
    c = sum(cs, Vector()) / len(cs)
    G.transform_bm(bm, Matrix.Translation(-c))
    return G.finalize_mesh_object("buckle", bm, coll, [M["m_steel_polished"], M["m_steel_brushed"]],
                                  location=tuple(origin + c), sharp_angle=35.0, wn_mode='CORNER_ANGLE')


BUILDERS = [build_straps, build_buckle]
