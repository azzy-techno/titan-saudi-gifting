# tsg_geom.py -- geometry helpers for the TSG-01 watch builder (Blender 5.2 + numpy).
# Units: millimetres (1 BU = 1 mm). Watch space: +Z dial normal, +Y 12 o'clock, +X 3 o'clock.
#
# Toolkit:
#   * 2D signed distance fields (numpy) + marching squares  -> smooth outline loops
#   * loop utilities (clean, Douglas-Peucker, resample, miter offset, winding)
#   * sweep(): extrude loops along a (inset, z) profile -> walls + bevel rings + CDT caps
#   * revolve(): lathe a (r, z) profile around Z (optional radius modulation, e.g. flutes)
#   * gear outlines (ogival wheel teeth, pinion leaves, club-tooth escape wheel)
#   * object finalisation (sharp edges by angle + weighted normals, applied)

import math
import numpy as np
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.geometry import delaunay_2d_cdt

TAU = 2.0 * math.pi


# ----------------------------------------------------------------------------- SDF 2D
class Grid:
    def __init__(self, x0, x1, y0, y1, res):
        self.res = float(res)
        self.xs = np.arange(x0, x1 + res * 0.5, res)
        self.ys = np.arange(y0, y1 + res * 0.5, res)
        self.X, self.Y = np.meshgrid(self.xs, self.ys)


def sd_circle(X, Y, c, r):
    return np.hypot(X - c[0], Y - c[1]) - r


def sd_segment(X, Y, a, b):
    ax, ay = a
    bx, by = b
    pax = X - ax
    pay = Y - ay
    bax = bx - ax
    bay = by - ay
    h = np.clip((pax * bax + pay * bay) / max(bax * bax + bay * bay, 1e-12), 0.0, 1.0)
    return np.hypot(pax - bax * h, pay - bay * h)


def sd_capsule(X, Y, a, b, r):
    return sd_segment(X, Y, a, b) - r


def sd_uneven_capsule(X, Y, a, b, ra, rb):
    """Capsule from a (radius ra) to b (radius rb), exact (I. Quilez)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    h = math.hypot(dx, dy)
    ux, uy = dx / h, dy / h
    px = X - a[0]
    py = Y - a[1]
    qx = np.abs(px * uy - py * ux)
    qy = px * ux + py * uy
    bb = (ra - rb) / h
    aa = math.sqrt(max(1.0 - bb * bb, 0.0))
    k = qx * (-bb) + qy * aa
    d0 = np.hypot(qx, qy) - ra
    d1 = np.hypot(qx, qy - h) - rb
    dm = qx * aa + qy * bb - ra
    return np.where(k < 0.0, d0, np.where(k > aa * h, d1, dm))


def sd_box(X, Y, c, half, r=0.0):
    qx = np.abs(X - c[0]) - (half[0] - r)
    qy = np.abs(Y - c[1]) - (half[1] - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def sd_polygon(X, Y, pts):
    """Exact signed distance to a simple polygon (negative inside)."""
    pts = np.asarray(pts, dtype=float)
    n = len(pts)
    d = (X - pts[0, 0]) ** 2 + (Y - pts[0, 1]) ** 2
    s = np.ones_like(X)
    j = n - 1
    for i in range(n):
        ex = pts[j, 0] - pts[i, 0]
        ey = pts[j, 1] - pts[i, 1]
        wx = X - pts[i, 0]
        wy = Y - pts[i, 1]
        h = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0.0, 1.0)
        bx = wx - ex * h
        by = wy - ey * h
        d = np.minimum(d, bx * bx + by * by)
        c1 = Y >= pts[i, 1]
        c2 = Y < pts[j, 1]
        c3 = (ex * wy) > (ey * wx)
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(flip, -s, s)
        j = i
    return s * np.sqrt(d)


def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def smax(a, b, k):
    return -smin(-a, -b, k)


def sample_bilinear(F, grid, x, y):
    fx = (x - grid.xs[0]) / grid.res
    fy = (y - grid.ys[0]) / grid.res
    j = int(min(max(math.floor(fx), 0), F.shape[1] - 2))
    i = int(min(max(math.floor(fy), 0), F.shape[0] - 2))
    tx = fx - j
    ty = fy - i
    return (F[i, j] * (1 - tx) * (1 - ty) + F[i, j + 1] * tx * (1 - ty)
            + F[i + 1, j] * (1 - tx) * ty + F[i + 1, j + 1] * tx * ty)


_MS_TABLE = {1: [(3, 0)], 2: [(0, 1)], 3: [(3, 1)], 4: [(1, 2)], 6: [(0, 2)], 7: [(3, 2)],
             8: [(2, 3)], 9: [(0, 2)], 11: [(1, 2)], 12: [(1, 3)], 13: [(0, 1)], 14: [(3, 0)]}


def contour_loops(F, grid, min_pts=6):
    """Marching squares on F (negative = inside). Returns closed loops (n,2) with the
    material (F<0) on the LEFT (outer boundaries CCW, holes CW)."""
    ny, nx = F.shape
    ins = F < 0
    c0 = ins[:-1, :-1].astype(np.int8)
    c1 = ins[:-1, 1:].astype(np.int8)
    c2 = ins[1:, 1:].astype(np.int8)
    c3 = ins[1:, :-1].astype(np.int8)
    code = c0 | (c1 << 1) | (c2 << 2) | (c3 << 3)
    I, J = np.nonzero((code > 0) & (code < 15))
    codes = code[I, J]
    center = (F[I, J] + F[I, J + 1] + F[I + 1, J + 1] + F[I + 1, J]) * 0.25
    e0 = (I * nx + J) * 2
    e1 = (I * nx + J + 1) * 2 + 1
    e2 = ((I + 1) * nx + J) * 2
    e3 = (I * nx + J) * 2 + 1
    E = np.stack([e0, e1, e2, e3], axis=1)
    adj = {}

    def link(a, b):
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)

    for k in range(len(I)):
        c = int(codes[k])
        ee = E[k]
        if c == 5:
            segs = [(0, 1), (2, 3)] if center[k] < 0 else [(3, 0), (1, 2)]
        elif c == 10:
            segs = [(3, 0), (1, 2)] if center[k] < 0 else [(0, 1), (2, 3)]
        else:
            segs = _MS_TABLE[c]
        for a, b in segs:
            link(int(ee[a]), int(ee[b]))

    xs, ys, res = grid.xs, grid.ys, grid.res

    def pos(e):
        cell = e // 2
        i = cell // nx
        j = cell % nx
        if e % 2 == 0:
            f0 = F[i, j]
            f1 = F[i, j + 1]
            t = f0 / (f0 - f1)
            return (xs[j] + t * res, ys[i])
        f0 = F[i, j]
        f1 = F[i + 1, j]
        t = f0 / (f0 - f1)
        return (xs[j], ys[i] + t * res)

    loops = []
    visited = set()
    for start in list(adj.keys()):
        if start in visited:
            continue
        seq = [start]
        visited.add(start)
        prev = None
        cur = start
        while True:
            nb = adj[cur]
            nxt = None
            for cand in nb:
                if cand != prev and cand not in visited:
                    nxt = cand
                    break
            if nxt is None:
                break
            seq.append(nxt)
            visited.add(nxt)
            prev, cur = cur, nxt
        if len(seq) >= min_pts:
            P = np.array([pos(e) for e in seq], dtype=float)
            P = clean_loop(P, res * 0.02)
            # orientation: material on the left
            votes = 0
            n = len(P)
            for t in range(0, n, max(1, n // 16)):
                a = P[t]
                b = P[(t + 1) % n]
                d = b - a
                L = math.hypot(d[0], d[1])
                if L < 1e-12:
                    continue
                nl = np.array([-d[1], d[0]]) / L
                m = (a + b) * 0.5 + nl * res * 0.35
                votes += 1 if sample_bilinear(F, grid, m[0], m[1]) < 0 else -1
            if votes < 0:
                P = P[::-1].copy()
            loops.append(P)
    return loops


# ----------------------------------------------------------------------------- loops
def clean_loop(P, eps):
    keep = [0]
    for i in range(1, len(P)):
        if np.hypot(*(P[i] - P[keep[-1]])) > eps:
            keep.append(i)
    P = P[keep]
    if len(P) > 2 and np.hypot(*(P[0] - P[-1])) <= eps:
        P = P[:-1]
    return P


def loop_area(P):
    x = P[:, 0]
    y = P[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def dp_closed(P, tol):
    """Douglas-Peucker for a closed loop."""
    n = len(P)
    if n < 8:
        return P
    d = np.hypot(P[:, 0] - P[0, 0], P[:, 1] - P[0, 1])
    k = int(np.argmax(d))
    keep = np.zeros(n, dtype=bool)
    keep[0] = keep[k] = True
    stack = [(0, k), (k, n)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        A = P[a]
        B = P[b % n]
        seg = P[a + 1:b]
        AB = B - A
        L = math.hypot(AB[0], AB[1])
        if L < 1e-12:
            dist = np.hypot(seg[:, 0] - A[0], seg[:, 1] - A[1])
        else:
            dist = np.abs(AB[0] * (seg[:, 1] - A[1]) - AB[1] * (seg[:, 0] - A[0])) / L
        m = int(np.argmax(dist))
        if dist[m] > tol:
            idx = a + 1 + m
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return P[keep]


def resample_max(P, max_len):
    out = []
    n = len(P)
    for i in range(n):
        a = P[i]
        b = P[(i + 1) % n]
        L = math.hypot(*(b - a))
        k = max(1, int(math.ceil(L / max_len)))
        for s in range(k):
            out.append(a + (b - a) * (s / k))
    return np.array(out)


def resample_uniform(P, step):
    Q = np.vstack([P, P[:1]])
    seg = np.hypot(*(np.diff(Q, axis=0).T))
    s = np.concatenate([[0], np.cumsum(seg)])
    total = s[-1]
    n = max(8, int(round(total / step)))
    t = np.linspace(0, total, n, endpoint=False)
    x = np.interp(t, s, Q[:, 0])
    y = np.interp(t, s, Q[:, 1])
    return np.stack([x, y], axis=1)


def smooth_loop(P, iters=2, lam=0.5):
    for _ in range(iters):
        P = P + lam * ((np.roll(P, 1, axis=0) + np.roll(P, -1, axis=0)) * 0.5 - P)
    return P


def offset_loop(P, d, min_cos=0.35):
    """Miter offset to the LEFT (into the material for material-on-left loops)."""
    if abs(d) < 1e-12:
        return P.copy()
    Pn = np.roll(P, -1, axis=0)
    Pp = np.roll(P, 1, axis=0)
    e1 = P - Pp
    e2 = Pn - P
    n1 = np.stack([-e1[:, 1], e1[:, 0]], 1)
    n1 /= np.maximum(np.linalg.norm(n1, axis=1, keepdims=True), 1e-12)
    n2 = np.stack([-e2[:, 1], e2[:, 0]], 1)
    n2 /= np.maximum(np.linalg.norm(n2, axis=1, keepdims=True), 1e-12)
    m = n1 + n2
    m /= np.maximum(np.linalg.norm(m, axis=1, keepdims=True), 1e-12)
    cos = np.clip((m * n2).sum(1, keepdims=True), min_cos, 1.0)
    return P + m * (d / cos)


def offset_loop_sdf(P, d, sdf_fn, iters=8, h=1e-3):
    """Offset into the material by projecting each point onto the level set sdf = -d
    (Newton steps along the numeric gradient). Keeps point correspondence and never
    self-intersects (points bunch up at convex corners whose radius < d)."""
    if abs(d) < 1e-12:
        return P.copy()
    Q = offset_loop(P, d)
    for _ in range(iters):
        x = Q[:, 0]
        y = Q[:, 1]
        f = sdf_fn(x, y) + d
        gx = (sdf_fn(x + h, y) - sdf_fn(x - h, y)) / (2 * h)
        gy = (sdf_fn(x, y + h) - sdf_fn(x, y - h)) / (2 * h)
        g2 = np.maximum(gx * gx + gy * gy, 1e-6)
        Q = Q - np.stack([gx * f / g2, gy * f / g2], 1)
    return Q


def winding(points, loops):
    pts = np.asarray(points, dtype=float)
    wn = np.zeros(len(pts), dtype=np.int64)
    px = pts[:, 0][:, None]
    py = pts[:, 1][:, None]
    for L in loops:
        A = L
        B = np.roll(L, -1, axis=0)
        ax = A[:, 0][None, :]
        ay = A[:, 1][None, :]
        bx = B[:, 0][None, :]
        by = B[:, 1][None, :]
        isl = (bx - ax) * (py - ay) - (px - ax) * (by - ay)
        up = (ay <= py) & (by > py) & (isl > 0)
        dn = (ay > py) & (by <= py) & (isl < 0)
        wn += up.sum(1) - dn.sum(1)
    return wn


def circle_loop(r, n, c=(0.0, 0.0), ccw=True, phase=0.0):
    t = np.linspace(0, TAU, n, endpoint=False) + phase
    P = np.stack([c[0] + r * np.cos(t), c[1] + r * np.sin(t)], 1)
    return P if ccw else P[::-1].copy()


def sdf_to_loops(F, grid, tol=0.0015, max_len=0.35, smooth=0, min_area=0.0):
    loops = []
    for P in contour_loops(F, grid):
        if smooth:
            P = smooth_loop(P, smooth)
        P = dp_closed(P, tol)
        P = resample_max(P, max_len)
        if abs(loop_area(P)) >= min_area:
            loops.append(P)
    return loops


def fillet(points, radii, segs=4, closed=False):
    """Round the corners of a polyline. radii[i] = corner radius at points[i]."""
    out = []
    n = len(points)
    for i in range(n):
        P = np.array(points[i], dtype=float)
        r = radii[i] if hasattr(radii, '__len__') else radii
        if r <= 0 or (not closed and (i == 0 or i == n - 1)):
            out.append((float(P[0]), float(P[1])))
            continue
        A = np.array(points[i - 1], dtype=float)
        B = np.array(points[(i + 1) % n], dtype=float)
        u = A - P
        lu = np.linalg.norm(u)
        w = B - P
        lw = np.linalg.norm(w)
        if lu < 1e-9 or lw < 1e-9:
            out.append((float(P[0]), float(P[1])))
            continue
        u /= lu
        w /= lw
        ang = math.acos(float(np.clip(np.dot(u, w), -1.0, 1.0)))
        if ang < 1e-3 or abs(ang - math.pi) < 1e-4:
            out.append((float(P[0]), float(P[1])))
            continue
        t = r / math.tan(ang / 2.0)
        t = min(t, 0.49 * lu, 0.49 * lw)
        re = t * math.tan(ang / 2.0)
        T1 = P + u * t
        T2 = P + w * t
        bis = u + w
        bis /= np.linalg.norm(bis)
        C = P + bis * (re / math.sin(ang / 2.0))
        a1 = math.atan2(T1[1] - C[1], T1[0] - C[0])
        a2 = math.atan2(T2[1] - C[1], T2[0] - C[0])
        da = (a2 - a1 + math.pi) % TAU - math.pi
        sg = segs[i] if hasattr(segs, '__len__') else segs
        for s in range(sg + 1):
            a = a1 + da * s / sg
            out.append((C[0] + re * math.cos(a), C[1] + re * math.sin(a)))
    return out


def polyline_length(pts):
    p = np.asarray(pts, dtype=float)
    return np.concatenate([[0.0], np.cumsum(np.hypot(*(np.diff(p, axis=0).T)))])


# ----------------------------------------------------------------------------- bmesh builders
def new_bm():
    bm = bmesh.new()
    bm.loops.layers.uv.verify()
    return bm


def _set_uv(face, uv_layer, uvs):
    for loop, uv in zip(face.loops, uvs):
        loop[uv_layer].uv = uv


def sweep(bm, loops, profile, *, mat_wall=0, mat_top=0, mat_bottom=0, seg_mats=None,
          cap_top=True, cap_bottom=True, wall_uv=None, cap_uv=None, interior_top=None,
          interior_bottom=None, smooth=True, extra_top=None, extra_bottom=None, sdf_fn=None):
    """Extrude material-on-left loops along profile [(inset, z), ...] (bottom -> top).
    seg_mats: optional list (len(profile)-1) of material indices per wall segment.
    wall_uv(x, y, z, s, k, li) / cap_uv(x, y, z, top) -> (u, v).
    interior_*: optional (m,2) arrays of extra cap points (for bending).
    Returns dict(top=[faces], bottom=[faces], walls=[[faces per segment]])."""
    uvl = bm.loops.layers.uv.verify()
    rings = []
    svals = []
    for L in loops:
        Q = np.vstack([L, L[:1]])
        s = np.concatenate([[0.0], np.cumsum(np.hypot(*(np.diff(Q, axis=0).T)))])
        svals.append(s)
        R = []
        cache = {}
        for (ins, z) in profile:
            key = round(float(ins), 6)
            if key not in cache:
                cache[key] = offset_loop_sdf(L, ins, sdf_fn) if sdf_fn is not None else offset_loop(L, ins)
            O = cache[key]
            R.append([bm.verts.new((float(o[0]), float(o[1]), float(z))) for o in O])
        rings.append(R)
    walls = [[] for _ in range(len(profile) - 1)]
    for li, L in enumerate(loops):
        n = len(L)
        s = svals[li]
        R = rings[li]
        for k in range(len(profile) - 1):
            ra = R[k]
            rb = R[k + 1]
            mi = seg_mats[k] if seg_mats is not None else mat_wall
            for i in range(n):
                i2 = (i + 1) % n
                f = bm.faces.new((ra[i], ra[i2], rb[i2], rb[i]))
                f.material_index = mi
                f.smooth = smooth
                if wall_uv is not None:
                    uvs = []
                    for (v, si, kk) in ((ra[i], s[i], k), (ra[i2], s[i + 1], k), (rb[i2], s[i + 1], k + 1), (rb[i], s[i], k + 1)):
                        uvs.append(wall_uv(v.co.x, v.co.y, v.co.z, si, kk, li))
                    _set_uv(f, uvl, uvs)
                walls[k].append(f)
    out = {"walls": walls, "top": [], "bottom": [], "rings": rings, "extra_top": [], "extra_bottom": []}
    zt = profile[-1][1]
    zb = profile[0][1]
    ext_t = [[bm.verts.new((float(p[0]), float(p[1]), float(zt))) for p in L] for L in (extra_top or [])]
    ext_b = [[bm.verts.new((float(p[0]), float(p[1]), float(zb))) for p in L] for L in (extra_bottom or [])]
    out["extra_top"] = ext_t
    out["extra_bottom"] = ext_b
    if cap_top:
        out["top"] = _cap(bm, [R[-1] for R in rings] + ext_t, True, mat_top, cap_uv, interior_top, smooth)
    if cap_bottom:
        out["bottom"] = _cap(bm, [R[0] for R in rings] + ext_b, False, mat_bottom, cap_uv, interior_bottom, smooth)
    return out


def weld_rings(bm, keep_verts, merge_verts, max_dist=1e-3):
    """Weld each vertex of merge_verts onto its nearest vertex of keep_verts."""
    from mathutils.kdtree import KDTree
    kd = KDTree(len(keep_verts))
    for i, v in enumerate(keep_verts):
        kd.insert(v.co, i)
    kd.balance()
    tmap = {}
    for v in merge_verts:
        co, idx, dist = kd.find(v.co)
        if dist <= max_dist:
            tmap[v] = keep_verts[idx]
    bmesh.ops.weld_verts(bm, targetmap=tmap)
    return len(tmap)


def _cap(bm, ring_list, up, mat, cap_uv, interior, smooth):
    uvl = bm.loops.layers.uv.verify()
    verts = []
    coords = []
    edges = []
    base = 0
    loops2d = []
    for ring in ring_list:
        n = len(ring)
        pts = np.array([(v.co.x, v.co.y) for v in ring])
        loops2d.append(pts)
        for v in ring:
            verts.append(v)
            coords.append(Vector((v.co.x, v.co.y)))
        edges += [(base + i, base + (i + 1) % n) for i in range(n)]
        base += n
    z = ring_list[0][0].co.z
    nin = len(coords)
    if interior is not None and len(interior):
        for p in interior:
            coords.append(Vector((float(p[0]), float(p[1]))))
    res = delaunay_2d_cdt(coords, edges, [], 0, 1e-7, True)
    ov, oe, of, orig_v = res[0], res[1], res[2], res[3]
    vmap = []
    for oi, co in enumerate(ov):
        src = orig_v[oi]
        if src and src[0] < nin:
            vmap.append(verts[src[0]])
        else:
            vmap.append(bm.verts.new((co.x, co.y, z)))
    tris = [f for f in of if len(f) == 3]
    if not tris:
        return []
    C = np.array([[(ov[a].x + ov[b].x + ov[c].x) / 3.0, (ov[a].y + ov[b].y + ov[c].y) / 3.0] for a, b, c in tris])
    wn = winding(C, loops2d)
    faces = []
    for (a, b, c), w in zip(tris, wn):
        if w == 0:
            continue
        area = (ov[b].x - ov[a].x) * (ov[c].y - ov[a].y) - (ov[c].x - ov[a].x) * (ov[b].y - ov[a].y)
        if abs(area) < 1e-14:
            continue
        tri = (a, b, c) if (area > 0) == up else (a, c, b)
        vv = [vmap[i] for i in tri]
        if len(set(vv)) < 3:
            continue
        try:
            f = bm.faces.new(vv)
        except ValueError:
            continue
        f.material_index = mat
        f.smooth = smooth
        if cap_uv is not None:
            _set_uv(f, uvl, [cap_uv(v.co.x, v.co.y, v.co.z, up) for v in vv])
        faces.append(f)
    return faces


def interior_points(sdf_fn, bounds, spacing, margin, jitter=0.15, seed=1):
    """Jittered grid points with sdf_fn(X,Y) < -margin (inside, away from the border)."""
    x0, x1, y0, y1 = bounds
    xs = np.arange(x0, x1, spacing)
    ys = np.arange(y0, y1, spacing)
    X, Y = np.meshgrid(xs, ys)
    rng = np.random.default_rng(seed)
    X = X + (rng.random(X.shape) - 0.5) * spacing * jitter
    Y = Y + (rng.random(Y.shape) - 0.5) * spacing * jitter
    D = sdf_fn(X, Y)
    m = D < -margin
    return np.stack([X[m], Y[m]], 1)


def revolve(bm, profile, segments, *, closed=False, mat_fn=None, uv_fn=None, radius_fn=None,
            smooth=True, theta0=0.0, pole_eps=1e-6):
    """Lathe a (r, z) profile around +Z. Material must be on the LEFT of the profile
    direction in the (r, z) half-plane (r to the right, z up) for outward normals.
    uv_fn(theta, k, r, z, u) -> (u, v); default u = theta/2pi, v = profile length.
    radius_fn(theta, k, r, z) -> r'."""
    uvl = bm.loops.layers.uv.verify()
    rings = []
    plen = polyline_length(profile)
    for k, (r, z) in enumerate(profile):
        if r < pole_eps:
            rings.append([bm.verts.new((0.0, 0.0, float(z)))])
            continue
        ring = []
        for j in range(segments):
            th = theta0 + TAU * j / segments
            rr = radius_fn(th, k, r, z) if radius_fn else r
            ring.append(bm.verts.new((rr * math.cos(th), rr * math.sin(th), float(z))))
        rings.append(ring)
    nprof = len(profile)
    kmax = nprof if closed else nprof - 1
    faces = []
    for k in range(kmax):
        k2 = (k + 1) % nprof
        A = rings[k]
        B = rings[k2]
        mi = mat_fn(k) if mat_fn else 0
        for j in range(segments):
            j2 = (j + 1) % segments
            uj = j / segments
            uj2 = (j + 1) / segments
            if len(A) == 1 and len(B) == 1:
                continue
            if len(A) == 1:
                vv = (A[0], B[j2], B[j])
                cr = ((uj + uj2) * 0.5, k), (uj2, k2), (uj, k2)
            elif len(B) == 1:
                vv = (A[j], A[j2], B[0])
                cr = (uj, k), (uj2, k), ((uj + uj2) * 0.5, k2)
            else:
                vv = (A[j], A[j2], B[j2], B[j])
                cr = (uj, k), (uj2, k), (uj2, k2), (uj, k2)
            try:
                f = bm.faces.new(vv)
            except ValueError:
                continue
            f.material_index = mi
            f.smooth = smooth
            uvs = []
            for (u, kk) in cr:
                r, z = profile[kk]
                if uv_fn:
                    uvs.append(uv_fn(u * TAU + theta0, kk, r, z, u))
                else:
                    uvs.append((u, float(plen[kk] if kk < len(plen) else plen[-1])))
            _set_uv(f, uvl, uvs)
            faces.append(f)
    return faces, rings


def transform_bm(bm, mat):
    bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)


def bm_add(bm_dst, bm_src):
    """Append bm_src geometry (with UVs + material indices) into bm_dst."""
    me = bpy.data.meshes.new("__tmp_join")
    bm_src.to_mesh(me)
    bm_dst.from_mesh(me)
    bpy.data.meshes.remove(me)


# ----------------------------------------------------------------------------- gears
def wheel_outline(z, m, add=1.20, ded=1.50, half_tooth=0.25, n_add=4, phase=0.0, ogive_pow=0.7):
    """Ogival watch wheel teeth (CCW). Returns (n,2) loop."""
    rp = m * z / 2.0
    ra = rp + add * m
    rf = rp - ded * m
    pitch = TAU / z
    w = half_tooth * pitch
    pts = []
    for i in range(z):
        c = phase + i * pitch
        pts.append(_pol(rf, c - pitch * 0.5))
        pts.append(_pol(rf, c - w - 0.06 * pitch))
        pts.append(_pol(rf + 0.18 * (rp - rf), c - w))
        for t in np.linspace(0.0, 1.0, n_add + 1)[:-1]:
            ang = c - w * (math.cos(t * math.pi / 2) ** ogive_pow)
            r = rp + (ra - rp) * math.sin(t * math.pi / 2)
            pts.append(_pol(r, ang))
        pts.append(_pol(ra, c))
        for t in np.linspace(1.0, 0.0, n_add + 1)[1:]:
            ang = c + w * (math.cos(t * math.pi / 2) ** ogive_pow)
            r = rp + (ra - rp) * math.sin(t * math.pi / 2)
            pts.append(_pol(r, ang))
        pts.append(_pol(rf + 0.18 * (rp - rf), c + w))
        pts.append(_pol(rf, c + w + 0.06 * pitch))
    return np.array(pts)


def pinion_outline(z, m, add=0.85, ded=1.75, half_leaf=0.17, n_tip=5, phase=0.0):
    """Pinion leaves with rounded tips (CCW)."""
    rp = m * z / 2.0
    ra = rp + add * m
    rf = rp - ded * m
    pitch = TAU / z
    w = half_leaf * pitch
    pts = []
    for i in range(z):
        c = phase + i * pitch
        pts.append(_pol(rf, c - pitch * 0.5))
        pts.append(_pol(rf + 0.05 * m, c - w * 1.15))
        pts.append(_pol(rp, c - w))
        for t in np.linspace(0, 1, n_tip + 2)[1:-1]:
            a = -math.pi / 2 + t * math.pi
            ang = c + w * math.sin(a)
            r = rp + (ra - rp) * math.cos(a)
            pts.append(_pol(r, ang))
        pts.append(_pol(rp, c + w))
        pts.append(_pol(rf + 0.05 * m, c + w * 1.15))
    return np.array(pts)


def escape_outline(z=20, r_tip=2.25, r_root=1.70, phase=0.0):
    """Swiss club-tooth escape wheel (CCW). Teeth lean CCW."""
    pitch = TAU / z
    # (angle offset in pitch fractions, radius) for one tooth, CCW order
    tooth = [(-0.50, r_root), (-0.30, r_root + 0.05), (-0.14, r_root + 0.22), (-0.02, r_tip - 0.13),
             (0.06, r_tip - 0.05), (0.13, r_tip - 0.015), (0.235, r_tip), (0.255, r_tip - 0.06),
             (0.215, r_tip - 0.30), (0.215, r_root + 0.12), (0.30, r_root)]
    pts = []
    for i in range(z):
        c = phase + i * pitch
        for f, r in tooth:
            pts.append(_pol(r, c + f * pitch))
    return np.array(pts)


def _pol(r, a):
    return (r * math.cos(a), r * math.sin(a))


# ----------------------------------------------------------------------------- objects
def apply_modifiers(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = obj.data
    nm = old.name
    obj.modifiers.clear()
    obj.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    me.name = nm
    return obj


def finalize_mesh_object(name, bm, collection, materials, *, location=(0.0, 0.0, 0.0),
                         rotation=(0.0, 0.0, 0.0), sharp_angle=33.0, weighted=True,
                         wn_weight=50, merge_dist=None, backface=True):
    if merge_dist:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge_dist)
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    collection.objects.link(obj)
    if sharp_angle is not None:
        me.set_sharp_from_angle(angle=math.radians(sharp_angle))
    if weighted:
        mod = obj.modifiers.new("WN", 'WEIGHTED_NORMAL')
        mod.mode = 'FACE_AREA'
        mod.keep_sharp = True
        mod.weight = wn_weight
        apply_modifiers(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def tri_count(obj):
    me = obj.data
    if me is None or not hasattr(me, "polygons"):
        return 0
    return int(sum(len(p.vertices) - 2 for p in me.polygons))
