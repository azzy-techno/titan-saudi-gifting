# tsg_parts_movement.py -- illustrative automatic movement (28,800 vph).
# Back side of the movement faces -Z (toward the caseback). "Visible" faces of bridges,
# wheels, rotor are the -Z faces.
import math
import numpy as np
import bpy
import bmesh
from mathutils import Matrix, Vector

import tsg_geom as G
import tsg_spec as S

COTES_ROT = math.radians(30.0)


def rimpt(ang_deg, r=14.3):
    a = math.radians(ang_deg)
    return (r * math.cos(a), r * math.sin(a))


def angdeg(p, origin=(0.0, 0.0)):
    return math.degrees(math.atan2(p[1] - origin[1], p[0] - origin[0]))


def sub(p, q):
    return (p[0] - q[0], p[1] - q[1])


def cotes_uv_fn(ox, oy):
    c, s = math.cos(COTES_ROT), math.sin(COTES_ROT)

    def f(x, y, z, up):
        X = x + ox
        Y = y + oy
        return ((X * c + Y * s) / 10.0, (-X * s + Y * c) / 10.0)
    return f


def perlage_uv_fn(ox, oy):
    def f(x, y, z, up):
        return ((x + ox) / 9.0, (y + oy) / 9.0)
    return f


def circ_uv(x, y, z, up):
    return (x / 26.0 + 0.5, y / 26.0 + 0.5)


# ----------------------------------------------------------------------------- small parts
def slotted_screw(bm_dst, x, y, z_seat, r_head=0.55, h=0.12, facing=-1.0, slot_ang=0.0, mat=0, shank=0.5):
    """Domed slotted screw whose head sits on z_seat and grows toward `facing` (-1 = -Z)."""
    b = G.new_bm()
    res = max(r_head / 120.0, 0.003)
    grid = G.Grid(-r_head * 1.1, r_head * 1.1, -r_head * 1.1, r_head * 1.1, res)
    slot_w = r_head * 0.13

    def halves(X, Y):
        return np.maximum(np.hypot(X, Y) - r_head, -(np.abs(X) - slot_w))

    disc_l = G.sdf_to_loops(np.hypot(grid.X, grid.Y) - r_head, grid, tol=res * 0.15, max_len=r_head / 6)
    half_l = G.sdf_to_loops(halves(grid.X, grid.Y), grid, tol=res * 0.15, max_len=r_head / 6)
    hb = h * 0.42
    ch = r_head * 0.07
    G.sweep(b, disc_l, [(0.0, 0.0), (0.0, hb - ch * 0.5), (ch * 0.5, hb)], mat_wall=mat, mat_top=mat, mat_bottom=mat)
    G.sweep(b, half_l, [(0.0, hb * 0.6), (0.0, h - ch), (ch, h)], mat_wall=mat, mat_top=mat, mat_bottom=mat,
            interior_top=G.interior_points(halves, (-r_head, r_head, -r_head, r_head), r_head / 4, r_head / 9),
            sdf_fn=halves)
    for v in b.verts:
        if v.co.z > hb * 0.95:
            rr = math.hypot(v.co.x, v.co.y)
            v.co.z += h * 0.55 * max(0.0, 1.0 - (rr / r_head) ** 2)
    if shank > 0:
        G.revolve(b, [(0.0, -shank), (r_head * 0.5, -shank), (r_head * 0.5, 0.0), (0.0, 0.0)][::1], 16,
                  mat_fn=lambda k: mat)
    m = Matrix.Translation((x, y, z_seat)) @ Matrix.Rotation(slot_ang, 4, 'Z')
    if facing < 0:
        m = m @ Matrix.Scale(-1.0, 4, (0, 0, 1))
        G.transform_bm(b, m)
        bmesh.ops.reverse_faces(b, faces=b.faces)
    else:
        G.transform_bm(b, m)
    G.bm_add(bm_dst, b)
    b.free()


def arbor_profile(z_back, z_dial, r_body=0.20, r_piv=0.075, shoulder=0.30):
    return [(0.0, z_back), (r_piv, z_back + 0.02), (r_piv, z_back + shoulder - 0.07), (r_body, z_back + shoulder),
            (r_body, z_dial - shoulder), (r_piv, z_dial - shoulder + 0.07), (r_piv, z_dial - 0.02), (0.0, z_dial)]


# ----------------------------------------------------------------------------- mainplate
def build_mainplate(coll, M):
    bm = G.new_bm()
    zc = -1.05
    pts = [(0.95, S.MP_Z1), (S.MVT_R, S.MP_Z1), (S.MVT_R, S.MP_Z0), (0.95, S.MP_Z0)]
    prof = G.fillet(pts, [0.03, 0.08, 0.08, 0.03], segs=[1, 2, 2, 1], closed=True)

    def uvf(theta, k, r, z, u):
        return (r * math.cos(theta) / 9.0, r * math.sin(theta) / 9.0)

    G.revolve(bm, prof, 128, closed=True, uv_fn=uvf)
    # rim ring with the balance cut-out
    grid = G.Grid(-15.6, 15.6, -15.6, 15.6, 0.02)
    X, Y = grid.X, grid.Y
    r = np.hypot(X, Y)

    def rim_fn(X, Y):
        rr = np.hypot(X, Y)
        ring = np.maximum(13.6 - rr, rr - S.MVT_R)
        return G.smax(ring, -G.sd_circle(X, Y, S.W, 4.95), 0.5)

    loops = G.sdf_to_loops(rim_fn(X, Y), grid, tol=0.001, max_len=0.42)
    G.sweep(bm, loops, [(0.06, S.RIM_Z), (0.0, S.RIM_Z + 0.06), (0.0, S.MP_Z1 + 0.05)],
            cap_uv=perlage_uv_fn(0, 0), sdf_fn=rim_fn)
    # pillars under inner bridge screws
    for (px, py) in PILLARS:
        b = G.new_bm()
        G.revolve(b, [(0.0, S.RIM_Z), (0.5, S.RIM_Z), (0.5, S.MP_Z1 + 0.05), (0.0, S.MP_Z1 + 0.05)], 24)
        G.transform_bm(b, Matrix.Translation((px, py, 0)))
        G.bm_add(bm, b)
        b.free()
    G.transform_bm(bm, Matrix.Translation((0, 0, -zc)))
    return G.finalize_mesh_object("mvmt_mainplate", bm, coll, [M["m_plate"]], location=(0, 0, zc), sharp_angle=35.0)


# ----------------------------------------------------------------------------- bridges
JEWEL_R = 0.60
SINK = 0.28


def _bridge_mesh(sdf_fn, bounds, z_vis, z_under, jewel_pts, origin, sink=SINK, anglage=0.07, res=0.02):
    """Bridge prism: visible face at z_vis (more negative), polished anglage, countersunk jewel holes."""
    grid = G.Grid(bounds[0], bounds[1], bounds[2], bounds[3], res)
    X, Y = grid.X, grid.Y

    def full(X, Y):
        d = sdf_fn(X, Y)
        for (jx, jy) in jewel_pts:
            d = np.maximum(d, -G.sd_circle(X, Y, (jx, jy), JEWEL_R))
        return d

    loops = G.sdf_to_loops(full(X, Y), grid, tol=0.0012, max_len=0.38)
    if anglage > 0:
        outer_prof = [(anglage, z_vis), (anglage * 0.3, z_vis + anglage * 0.7), (0.0, z_vis + anglage), (0.0, z_under)]
        n_pol = 2
    else:
        outer_prof = [(0.0, z_vis), (0.0, z_under)]
        n_pol = 0
    hole_prof = [(sink, z_vis), (0.0, z_vis + sink), (0.0, z_under)] if sink > 0 else [(0.0, z_vis), (0.0, z_under)]
    profs = []
    for L in loops:
        if G.loop_area(L) > 0:
            profs.append(outer_prof)
        else:
            profs.append(hole_prof)

    def segmat(li, k):
        return 1 if (profs[li] is hole_prof and k == 0 and sink > 0) or (profs[li] is outer_prof and k < n_pol) else 2

    bm = G.new_bm()
    # visible (back) face: Cotes de Geneve; dial-side face (hidden when assembled): perlage, as on real bridges
    G.sweep(bm, loops, None, loop_profiles=profs, seg_mats=segmat, mat_top=3, mat_bottom=0,
            cap_uv=cotes_uv_fn(0, 0), sdf_fn=full)
    # cap UVs are in watch space already (loops are in watch space); move to local origin afterwards
    G.transform_bm(bm, Matrix.Translation((-origin[0], -origin[1], -origin[2])))
    return bm


def _centroid(fn, bounds, res=0.05):
    grid = G.Grid(bounds[0], bounds[1], bounds[2], bounds[3], res)
    m = fn(grid.X, grid.Y) < 0
    return (float(grid.X[m].mean()), float(grid.Y[m].mean()))


THB = angdeg(S.B)
B1_A0, B1_A1 = 9.0, 154.0          # 3/4-plate barrel bridge sector (deg)
B1_PILLAR = rimpt(25.0, 6.0)
B_SCREWS = [rimpt(22.0, 14.2), rimpt(88.0, 14.2), rimpt(146.0, 14.2), B1_PILLAR]
B1_JEWELS = [rimpt(52.0, 9.4), rimpt(78.0, 11.6)]
THF = angdeg(S.F)
THT = angdeg(S.T)
T_ARM = rimpt(THT - 6.0)
F_ARM = rimpt(THF)
TRAIN_SCREWS = [T_ARM, F_ARM]
COCK_FOOT = rimpt(246.0, 14.15)
PILLARS = [B1_PILLAR]


def bridge1_fn(X, Y):
    rr = np.hypot(X, Y)
    r0 = math.radians(B1_A0)
    r1 = math.radians(B1_A1)
    hp0 = -(X * -math.sin(r0) + Y * math.cos(r0))
    hp1 = -(X * math.sin(r1) + Y * -math.cos(r1))
    d = G.smax(G.smax(np.maximum(3.6 - rr, rr - 14.92), hp0, 1.6), hp1, 1.6)
    d = G.smin(d, G.sd_circle(X, Y, S.B, 5.55), 1.2)
    return G.smax(d, rr - 14.92, 0.3)


def bridge2_fn(X, Y):
    rr = np.hypot(X, Y)
    C, T, F, E, P = S.C, S.T, S.F, S.E, S.P
    d = G.sd_uneven_capsule(X, Y, C, T, 1.25, 1.12)
    d = G.smin(d, G.sd_uneven_capsule(X, Y, T, F, 1.12, 1.08), 0.7)
    d = G.smin(d, G.sd_uneven_capsule(X, Y, F, E, 1.08, 0.98), 0.7)
    d = G.smin(d, G.sd_uneven_capsule(X, Y, E, P, 0.98, 0.90), 0.6)
    d = G.smin(d, G.sd_uneven_capsule(X, Y, T, T_ARM, 1.0, 1.25), 0.9)
    d = G.smin(d, G.sd_uneven_capsule(X, Y, F, F_ARM, 1.0, 1.25), 0.9)
    for p, r in ((C, 1.55), (T, 1.38), (F, 1.32), (E, 1.18), (P, 1.08)):
        d = G.smin(d, G.sd_circle(X, Y, p, r), 0.5)
    return G.smax(d, rr - 14.92, 0.3)


def cock_fn(X, Y):
    rr = np.hypot(X, Y)
    d = G.sd_uneven_capsule(X, Y, COCK_FOOT, S.W, 1.75, 1.05)
    d = G.smin(d, G.sd_circle(X, Y, S.W, 1.55), 0.8)
    d = G.smin(d, G.sd_circle(X, Y, COCK_FOOT, 1.5), 0.5)
    return G.smax(d, rr - 14.92, 0.3)


def _bounds(fn, pad=0.6):
    g = G.Grid(-15.5, 15.5, -15.5, 15.5, 0.1)
    m = fn(g.X, g.Y) < 0
    return (float(g.X[m].min() - pad), float(g.X[m].max() + pad), float(g.Y[m].min() - pad), float(g.Y[m].max() + pad))


def build_bridges(coll, M):
    mats = [M["m_bridge"], M["m_movement_steel"], M["m_bridge"], M["m_plate"]]
    obs = []
    zc = 0.5 * (S.BRIDGE_Z0 + S.BRIDGE_Z1)
    # --- barrel bridge (with recessed ratchet wheel + screws)
    b1 = _bounds(bridge1_fn)
    c1 = _centroid(bridge1_fn, b1)
    origin = (c1[0], c1[1], zc)
    z_pocket = -3.92

    def b1_upper(X, Y):
        return np.maximum(bridge1_fn(X, Y), -G.sd_circle(X, Y, S.B, 3.55))

    bm = _bridge_mesh(b1_upper, b1, S.BRIDGE_Z1, z_pocket, B1_JEWELS, origin)
    lower = _bridge_mesh(bridge1_fn, b1, z_pocket + 0.02, S.BRIDGE_Z0, B1_JEWELS, origin, anglage=0.0, sink=0.0)
    G.bm_add(bm, lower)
    lower.free()
    # ratchet wheel (36 saw teeth) sitting in the pocket
    rt = []
    n = 36
    for i in range(n):
        a = G.TAU * i / n
        rt += [G._pol(3.02, a), G._pol(3.36, a + G.TAU / n * 0.82), G._pol(3.02, a + G.TAU / n * 0.86)]
    rt = np.array(rt) + np.array(S.B)
    rb = G.new_bm()
    G.sweep(rb, [rt], [(0.03, -4.24), (0.0, -4.21), (0.0, z_pocket - 0.01)], mat_wall=1, mat_top=1, mat_bottom=1)
    G.transform_bm(rb, Matrix.Translation((-origin[0], -origin[1], -origin[2])))
    G.bm_add(bm, rb)
    rb.free()
    slotted_screw(bm, S.B[0] - origin[0], S.B[1] - origin[1], -4.24 - origin[2], r_head=0.95, h=0.09, mat=1, shank=0)
    for p in B_SCREWS:
        slotted_screw(bm, p[0] - origin[0], p[1] - origin[1], S.BRIDGE_Z1 - origin[2], r_head=0.58, h=0.12,
                      slot_ang=math.radians(angdeg(p) + 30), mat=1)
    obs.append(G.finalize_mesh_object("mvmt_bridge_01", bm, coll, mats, location=origin, sharp_angle=35.0))
    # --- train bridge
    jp = [S.C, S.T, S.F, S.E, S.P]
    b2 = _bounds(bridge2_fn)
    c2 = _centroid(bridge2_fn, b2)
    origin = (c2[0], c2[1], zc)
    bm = _bridge_mesh(bridge2_fn, b2, S.BRIDGE_Z1, S.BRIDGE_Z0, jp, origin)
    for p in TRAIN_SCREWS:
        slotted_screw(bm, p[0] - origin[0], p[1] - origin[1], S.BRIDGE_Z1 - origin[2], r_head=0.58, h=0.12,
                      slot_ang=math.radians(angdeg(p) - 20), mat=1)
    obs.append(G.finalize_mesh_object("mvmt_bridge_02", bm, coll, mats, location=origin, sharp_angle=35.0))
    # --- balance cock (raised; foot block down to the rim; hairspring stud)
    b3 = _bounds(cock_fn)
    c3 = _centroid(cock_fn, b3)
    zc3 = 0.5 * (S.COCK_Z0 + S.COCK_Z1)
    origin = (c3[0], c3[1], zc3)
    bm = _bridge_mesh(cock_fn, b3, S.COCK_Z1, S.COCK_Z0, [S.W], origin, sink=0.24)

    def foot_fn(X, Y):
        return G.sd_circle(X, Y, COCK_FOOT, 1.45)

    foot = _bridge_mesh(foot_fn, (COCK_FOOT[0] - 2, COCK_FOOT[0] + 2, COCK_FOOT[1] - 2, COCK_FOOT[1] + 2),
                        S.COCK_Z0 + 0.02, S.RIM_Z, [], origin, anglage=0.0, res=0.01)
    G.bm_add(bm, foot)
    foot.free()
    # polished chaton ring around the cap jewel
    ch = G.new_bm()
    G.revolve(ch, G.fillet([(0.86, S.COCK_Z1 + 0.01), (1.12, S.COCK_Z1 + 0.01), (1.12, S.COCK_Z1 - 0.05),
                            (0.86, S.COCK_Z1 - 0.05)], [0, 0.03, 0.03, 0], segs=[0, 2, 2, 0], closed=True)[::-1],
              48, closed=True, mat_fn=lambda k: 1)
    G.transform_bm(ch, Matrix.Translation((S.W[0] - origin[0], S.W[1] - origin[1], -origin[2])))
    G.bm_add(bm, ch)
    ch.free()
    # stud (hairspring outer attachment) under the arm
    sp = hs_stud_point()
    st = G.new_bm()
    G.sweep(st, [np.array([(-0.18, -0.13), (0.18, -0.13), (0.18, 0.13), (-0.18, 0.13)])],
            [(0.0, S.COCK_Z0 - 0.02), (0.0, S.HS_Z + 0.06)], mat_wall=1, mat_top=1, mat_bottom=1)
    G.transform_bm(st, Matrix.Translation((sp[0] - origin[0], sp[1] - origin[1], -origin[2])))
    G.bm_add(bm, st)
    st.free()
    slotted_screw(bm, COCK_FOOT[0] - origin[0], COCK_FOOT[1] - origin[1], S.COCK_Z1 - origin[2], r_head=0.62, h=0.09,
                  slot_ang=0.4, mat=1)
    obs.append(G.finalize_mesh_object("mvmt_bridge_03", bm, coll, mats, location=origin, sharp_angle=35.0))
    return obs


def hs_stud_point():
    a = math.atan2(COCK_FOOT[1] - S.W[1], COCK_FOOT[0] - S.W[0])
    return (S.W[0] + 3.40 * math.cos(a), S.W[1] + 3.40 * math.sin(a))


# ----------------------------------------------------------------------------- jewels (linked duplicates)
def build_jewels(coll, M):
    me_name = "jewel_mesh"
    old = bpy.data.meshes.get(me_name)
    if old is not None and old.users == 0:
        bpy.data.meshes.remove(old)
    zt = 0.0
    prof = [(0.0, zt - 0.045), (0.07, zt - 0.025), (0.13, zt), (0.40, zt - 0.015), (0.56, zt - 0.06),
            (0.58, zt - 0.12), (0.58, zt - 0.26), (0.0, zt - 0.26)]
    prof = G.fillet(prof, [0, 0.0, 0.03, 0.10, 0.04, 0.0, 0.0, 0], segs=[0, 0, 1, 2, 1, 0, 0, 0])
    # walk must keep material on the left: reverse (bottom -> top outer surface)
    bm = G.new_bm()
    G.revolve(bm, prof[::-1], 20)
    tmp = G.finalize_mesh_object("__jewel_tmp", bm, coll, [M["m_ruby"]], sharp_angle=40.0)
    me = tmp.data
    me.name = me_name
    bpy.data.objects.remove(tmp, do_unlink=True)
    zj = S.BRIDGE_Z1 + SINK + 0.02
    pts = [(S.C, zj), (S.T, zj), (S.F, zj), (S.E, zj), (S.P, zj), (S.W, S.COCK_Z1 + 0.24 + 0.02)]
    pts += [(p, zj) for p in B1_JEWELS]
    cx = sum(p[0][0] for p in pts) / len(pts)
    cy = sum(p[0][1] for p in pts) / len(pts)
    cz = sum(p[1] for p in pts) / len(pts)
    emp = bpy.data.objects.new("jewels", None)
    emp.empty_display_type = 'PLAIN_AXES'
    emp.empty_display_size = 2.0
    coll.objects.link(emp)
    emp.location = (cx, cy, cz)
    children = []
    for i, (p, z) in enumerate(pts):
        ob = bpy.data.objects.new("jewel_%02d" % (i + 1), me)
        coll.objects.link(ob)
        ob.parent = emp
        # jewel geometry: top at local z=0, facing +Z; flip so the domed face looks toward -Z (back)
        ob.location = (p[0] - cx, p[1] - cy, z - cz)
        ob.rotation_euler = (math.pi, 0.0, 0.0)
        children.append(ob)
    return [emp] + children


# ----------------------------------------------------------------------------- wheels
def _spoke_windows(hub_r, rim_r, n, w_hub, w_rim, phase=0.0, k=0.10, res=0.01):
    R = rim_r + 0.2
    grid = G.Grid(-R, R, -R, R, res)
    X, Y = grid.X, grid.Y
    rr = np.hypot(X, Y)
    ann = np.maximum(hub_r - rr, rr - rim_r)
    sp = None
    for i in range(n):
        a = phase + G.TAU * i / n
        c = G.sd_uneven_capsule(X, Y, (0, 0), (R * math.cos(a), R * math.sin(a)), w_hub / 2, w_rim / 2)
        sp = c if sp is None else np.minimum(sp, c)
    win = G.smax(ann, -sp, k)
    return [L[::-1].copy() for L in G.sdf_to_loops(win, grid, tol=0.0008, max_len=0.22)]


def wheel_object(name, pos, z_mid, outline, windows, pinion_outline, z_pin, arbor_z, coll, M,
                 thick=S.WHEEL_T, gilt=True):
    z0 = z_mid - thick / 2      # visible (back) face
    z1 = z_mid + thick / 2
    bm = G.new_bm()
    prof = [(0.028, z0), (0.0, z0 + 0.028), (0.0, z1)]
    G.sweep(bm, [outline] + windows, prof, mat_wall=0, mat_top=0, mat_bottom=0, cap_uv=circ_uv)
    if pinion_outline is not None:
        pz0, pz1 = z_pin
        G.sweep(bm, [pinion_outline], [(0.015, pz0), (0.0, pz0 + 0.015), (0.0, pz1 - 0.015), (0.015, pz1)],
                mat_wall=1, mat_top=1, mat_bottom=1)
    G.revolve(bm, arbor_profile(arbor_z[0], arbor_z[1]), 20, mat_fn=lambda k: 1)
    # hub collar (polished) on the visible side
    G.revolve(bm, G.fillet([(0.0, z0 - 0.06), (0.42, z0 - 0.06), (0.42, z1), (0.0, z1)], [0, 0.03, 0, 0],
                           segs=[0, 2, 0, 0]), 32, mat_fn=lambda k: 1)
    G.transform_bm(bm, Matrix.Translation((0, 0, -z_mid)))
    return G.finalize_mesh_object(name, bm, coll, [M["m_gilt"] if gilt else M["m_movement_steel"],
                                                   M["m_movement_steel"]],
                                  location=(pos[0], pos[1], z_mid), sharp_angle=35.0)


def _mesh_phase(a_from, a_to_deg, teeth):
    return math.radians(a_to_deg)


def build_wheels(coll, M):
    obs = []
    C, T, F, E, P, B = S.C, S.T, S.F, S.E, S.P, S.B
    zb = (-3.87, -1.20)
    # centre wheel: 80T m0.12 at L1, pinion 12 (m0.14) at barrel teeth Z
    th_ct = math.radians(angdeg(T, C))
    th_cb = math.radians(angdeg(B, C))
    out = G.wheel_outline(80, 0.12, phase=th_ct, n_add=2)
    win = _spoke_windows(0.95, 0.12 * 80 / 2 - 0.12 * 1.5 - 0.55, 5, 0.34, 0.24, phase=th_ct + 0.3)
    pin = G.pinion_outline(12, 0.14, phase=th_cb + math.pi / 12, n_tip=3)
    obs.append(wheel_object("wheel_center", C, S.L1, out, win, pin, (S.BARREL_TEETH_Z[1], S.BARREL_TEETH_Z[0]),
                            (zb[0], -0.45), coll, M))
    # third wheel: 75T m0.11 at L2, pinion 10 (m0.12) at L1
    th_tf = math.radians(angdeg(F, T))
    th_tc = math.radians(angdeg(C, T))
    out = G.wheel_outline(75, 0.11, phase=th_tf, n_add=2)
    win = _spoke_windows(0.78, 0.11 * 75 / 2 - 0.11 * 1.5 - 0.5, 5, 0.30, 0.22, phase=th_tf + 0.5)
    pin = G.pinion_outline(10, 0.12, phase=th_tc + math.pi / 10, n_tip=3)
    obs.append(wheel_object("wheel_third", T, S.L2, out, win, pin, (S.L1 - 0.15, S.L1 + 0.15), zb, coll, M))
    # fourth wheel: 84T m0.09 at L3, pinion 10 (m0.11) at L2
    th_fe = math.radians(angdeg(E, F))
    th_ft = math.radians(angdeg(T, F))
    out = G.wheel_outline(84, 0.09, phase=th_fe, n_add=2)
    win = _spoke_windows(0.68, 0.09 * 84 / 2 - 0.09 * 1.5 - 0.45, 4, 0.28, 0.20, phase=th_fe + 0.4)
    pin = G.pinion_outline(10, 0.11, phase=th_ft + math.pi / 10, n_tip=3)
    obs.append(wheel_object("wheel_fourth", F, S.L3, out, win, pin, (S.L2 - 0.15, S.L2 + 0.15), zb, coll, M))
    # escape wheel: 20 club teeth at L4, pinion 7 (m0.09) at L3; a tooth tip at the entry pallet
    th_ep = angdeg(P, E)
    ph = math.radians(th_ep - 27.0 - 0.235 * 18.0)
    out = G.escape_outline(20, 2.25, 1.70, phase=ph)
    win = _spoke_windows(0.50, 1.32, 4, 0.22, 0.16, phase=ph + 0.2, res=0.006)
    th_ef = math.radians(angdeg(F, E))
    pin = G.pinion_outline(7, 0.09, phase=th_ef + math.pi / 7, n_tip=3)
    obs.append(wheel_object("wheel_escape", E, S.L4, out, win, pin, (S.L3 - 0.15, S.L3 + 0.15), zb, coll, M))
    return obs


# ----------------------------------------------------------------------------- barrel
def build_barrel(coll, M):
    B = S.B
    zt0, zt1 = S.BARREL_TEETH_Z     # (-1.90, -2.20): dial-side toothed rim
    z_lid = -3.50
    zc = 0.5 * (zt0 + z_lid)
    bm = G.new_bm()
    th_bc = math.radians(angdeg(S.C, B))
    teeth = G.wheel_outline(72, 0.14, phase=th_bc, n_add=2)
    G.sweep(bm, [teeth], [(0.02, zt1), (0.0, zt1 + 0.02), (0.0, zt0)], cap_uv=circ_uv)
    # drum + lid (revolve), material on the left walking from the axis at the lid outward
    drum = [(0.0, z_lid), (1.30, z_lid), (1.30, z_lid + 0.06), (4.55, z_lid + 0.06), (4.80, z_lid),
            (4.80, zt1 + 0.01), (0.0, zt1 + 0.01)]
    drum = G.fillet(drum, [0, 0.05, 0.05, 0.08, 0.10, 0.0, 0], segs=[0, 2, 2, 2, 3, 0, 0])

    def uvf(theta, k, r, z, u):
        return (r * math.cos(theta) / 26.0 + 0.5, r * math.sin(theta) / 26.0 + 0.5)

    G.revolve(bm, drum, 96, uv_fn=uvf)
    G.revolve(bm, arbor_profile(-3.87, -1.2, r_body=0.55, r_piv=0.30, shoulder=0.25), 32, mat_fn=lambda k: 1)
    G.transform_bm(bm, Matrix.Translation((0, 0, -zc)))
    return G.finalize_mesh_object("barrel", bm, coll, [M["m_gilt"], M["m_movement_steel"]],
                                  location=(B[0], B[1], zc), sharp_angle=35.0)


# ----------------------------------------------------------------------------- pallet fork
def build_pallet_fork(coll, M):
    P = S.P
    z = S.L4
    grid = G.Grid(-4.4, 1.3, -1.6, 1.6, 0.005)

    def fork_fn(X, Y):
        d = G.sd_circle(X, Y, (0, 0), 0.40)
        for s in (1.0, -1.0):
            d = G.smin(d, G.sd_uneven_capsule(X, Y, (0.0, 0.0), (0.40, 1.00 * s), 0.26, 0.20), 0.18)
        d = G.smin(d, G.sd_uneven_capsule(X, Y, (0.0, 0.0), (-3.25, 0.0), 0.22, 0.14), 0.2)
        for s in (1.0, -1.0):
            d = G.smin(d, G.sd_uneven_capsule(X, Y, (-3.2, 0.26 * s), (-3.92, 0.27 * s), 0.12, 0.09), 0.15)
        d = G.smax(d, -G.sd_box(X, Y, (-3.85, 0.0), (0.45, 0.165), 0.05), 0.04)
        return d

    loops = G.sdf_to_loops(fork_fn(grid.X, grid.Y), grid, tol=0.0006, max_len=0.08)
    bm = G.new_bm()
    t = 0.18
    G.sweep(bm, loops, [(0.02, z - t / 2), (0.0, z - t / 2 + 0.02), (0.0, z + t / 2 - 0.015), (0.015, z + t / 2)],
            sdf_fn=fork_fn, mat_wall=0, mat_top=0, mat_bottom=0)
    # pallet stones (ruby), long rectangles toward the escape wheel
    E_local = (S.E[0] - P[0], S.E[1] - P[1])
    for s in (1.0, -1.0):
        a0 = (0.30, 1.00 * s)
        tip = (E_local[0] + 2.27 * math.cos(math.radians(180 - 27 * s)), E_local[1] + 2.27 * math.sin(math.radians(180 - 27 * s)))
        dx, dy = tip[0] - a0[0], tip[1] - a0[1]
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        hw = 0.085
        rect = np.array([(a0[0] - nx * hw, a0[1] - ny * hw), (tip[0] - nx * hw, tip[1] - ny * hw),
                         (tip[0] + nx * hw, tip[1] + ny * hw), (a0[0] + nx * hw, a0[1] + ny * hw)])
        if G.loop_area(rect) < 0:
            rect = rect[::-1].copy()
        G.sweep(bm, [rect], [(0.0, z - 0.12), (0.0, z + 0.12)], mat_wall=2, mat_top=2, mat_bottom=2)
    G.revolve(bm, arbor_profile(-3.87, -1.2, r_body=0.17), 20, mat_fn=lambda k: 0)
    G.transform_bm(bm, Matrix.Translation((0, 0, -z)))
    return G.finalize_mesh_object("pallet_fork", bm, coll, [M["m_movement_steel"], M["m_movement_steel"], M["m_ruby"]],
                                  location=(P[0], P[1], z), sharp_angle=35.0)


# ----------------------------------------------------------------------------- balance wheel + hairspring
def build_balance(coll, M):
    W = S.W
    zr0, zr1 = S.BAL_RIM_Z1, S.BAL_RIM_Z0     # -3.45 (visible) .. -3.10
    zc = 0.5 * (zr0 + zr1)
    bm = G.new_bm()
    rim = [(4.00, zr0), (4.40, zr0), (4.40, zr1), (4.00, zr1)]
    G.revolve(bm, G.fillet(rim, [0.035, 0.05, 0.05, 0.035], segs=1, closed=True), 96, closed=True,
              uv_fn=lambda th, k, r, z, u: (r * math.cos(th) / 26 + 0.5, r * math.sin(th) / 26 + 0.5))
    # arms (3) + hub, flush with the visible face
    grid = G.Grid(-4.3, 4.3, -4.3, 4.3, 0.01)

    def arms_fn(X, Y):
        rr = np.hypot(X, Y)
        d = G.sd_circle(X, Y, (0, 0), 0.62)
        for i in range(3):
            a = math.radians(90 + 120 * i)
            d = G.smin(d, G.sd_uneven_capsule(X, Y, (0, 0), (4.2 * math.cos(a), 4.2 * math.sin(a)), 0.20, 0.15), 0.3)
        return np.maximum(d, rr - 4.1)

    loops = G.sdf_to_loops(arms_fn(grid.X, grid.Y), grid, tol=0.0008, max_len=0.15)
    G.sweep(bm, loops, [(0.02, zr0), (0.0, zr0 + 0.02), (0.0, zr0 + 0.18)], sdf_fn=arms_fn, cap_uv=circ_uv)
    # timing screws on the rim (radial)
    for i in range(8):
        a = math.radians(22.5 + 45 * i)
        b = G.new_bm()
        G.revolve(b, G.fillet([(0.0, 0.0), (0.16, 0.0), (0.16, 0.14), (0.0, 0.20)], [0, 0, 0.05, 0], segs=[0, 0, 2, 0]), 16)
        G.transform_bm(b, Matrix.Translation((4.38 * math.cos(a), 4.38 * math.sin(a), zc)) @
                       Matrix.Rotation(a, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'Y'))
        G.bm_add(bm, b)
        b.free()
    # staff + roller table (steel) + impulse pin (ruby)
    G.revolve(bm, [(0.0, -4.02), (0.07, -4.0), (0.07, -3.80), (0.16, -3.74), (0.16, -1.55), (0.07, -1.48),
                   (0.07, -1.22), (0.0, -1.20)], 20, mat_fn=lambda k: 1)
    G.revolve(bm, G.fillet([(0.0, -3.10), (0.58, -3.10), (0.58, -3.04), (0.0, -3.04)], [0, 0.02, 0.02, 0], segs=1),
              40, mat_fn=lambda k: 1)
    pin = G.new_bm()
    G.revolve(pin, [(0.0, -3.06), (0.075, -3.06), (0.075, -2.86), (0.0, -2.86)], 12, mat_fn=lambda k: 2)
    G.transform_bm(pin, Matrix.Translation((0.42, 0.0, 0.0)))
    G.bm_add(bm, pin)
    pin.free()
    G.transform_bm(bm, Matrix.Translation((0, 0, -zc)))
    return G.finalize_mesh_object("balance_wheel", bm, coll, [M["m_gilt"], M["m_movement_steel"], M["m_ruby"]],
                                  location=(W[0], W[1], zc), sharp_angle=35.0)


def build_hairspring(coll, M):
    W = S.W
    z0, z1 = S.HS_Z - 0.055, S.HS_Z + 0.055
    turns = 12
    r0, r1 = 0.58, 3.12
    sp = hs_stud_point()
    a_stud = math.atan2(sp[1] - W[1], sp[0] - W[0])
    phi_end = turns * G.TAU
    a_off = a_stud - phi_end
    n = turns * 40
    pts = []
    for i in range(n + 1):
        f = i / n
        phi = f * phi_end
        r = r0 + (r1 - r0) * f
        pts.append((r * math.cos(phi + a_off), r * math.sin(phi + a_off)))
    # terminal dog-leg out to the stud
    ex, ey = pts[-1]
    for k in range(1, 5):
        rr = r1 + (3.40 - r1) * k / 4
        pts.append((rr * math.cos(a_stud + 0.05 * k), rr * math.sin(a_stud + 0.05 * k)))
    P2 = np.array(pts)
    tw = 0.036
    bm = G.new_bm()
    # ribbon with a rectangular section: build left/right offset polylines
    d = np.gradient(P2, axis=0)
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1)
    Lp = P2 + nrm * tw / 2
    Rp = P2 - nrm * tw / 2
    rings = []
    for i in range(len(P2)):
        rings.append([bm.verts.new((Lp[i, 0], Lp[i, 1], z0)), bm.verts.new((Rp[i, 0], Rp[i, 1], z0)),
                      bm.verts.new((Rp[i, 0], Rp[i, 1], z1)), bm.verts.new((Lp[i, 0], Lp[i, 1], z1))])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(4):
            k2 = (k + 1) % 4
            f = bm.faces.new((a[k], b[k], b[k2], a[k2]))
            f.smooth = True
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    # collet
    G.revolve(bm, [(0.0, S.HS_Z - 0.10), (0.45, S.HS_Z - 0.10), (0.45, S.HS_Z + 0.08), (0.0, S.HS_Z + 0.08)], 32,
              mat_fn=lambda k: 1)
    G.transform_bm(bm, Matrix.Translation((0, 0, -S.HS_Z)))
    return G.finalize_mesh_object("hairspring", bm, coll, [M["m_hairspring"], M["m_movement_steel"]],
                                  location=(W[0], W[1], S.HS_Z), sharp_angle=60.0)


# ----------------------------------------------------------------------------- rotor
def build_rotor(coll, M):
    z_d, z_b = S.ROTOR_Z0, S.ROTOR_Z1      # -4.40 (dial side), -4.98 (back)
    z_plate_b = -4.70
    zc = 0.5 * (z_d + z_b)
    grid = G.Grid(-14.8, 14.8, -14.8, 1.8, 0.02)

    def plate_fn(X, Y):
        rr = np.hypot(X, Y)
        half = G.smax(rr - 12.3, Y - 0.9, 0.6)
        d = G.smin(half, G.sd_circle(X, Y, (0, 0), 2.9), 0.8)
        # openwork windows between straight spokes of constant width (2*hw)
        hw = 0.95
        for a0, a1 in ((-180.0, -90.0), (-90.0, 0.0)):
            r0 = math.radians(a0)
            r1 = math.radians(a1)
            hp0 = hw - (X * -math.sin(r0) + Y * math.cos(r0))      # CCW of ray a0
            hp1 = hw - (X * math.sin(r1) + Y * -math.cos(r1))      # CW of ray a1
            win = np.maximum(4.0 - rr, rr - 10.8)
            win = G.smax(G.smax(win, hp0, 0.7), hp1, 0.7)
            d = G.smax(d, -win, 0.25)
        return d

    def weight_fn(X, Y):
        rr = np.hypot(X, Y)
        ring = np.maximum(11.7 - rr, rr - 14.55)
        return G.smax(ring, Y - 0.9, 0.5)

    bm = G.new_bm()
    lp = G.sdf_to_loops(plate_fn(grid.X, grid.Y), grid, tol=0.001, max_len=0.5)
    G.sweep(bm, lp, [(0.04, z_plate_b), (0.0, z_plate_b + 0.04), (0.0, z_d - 0.03), (0.03, z_d)], sdf_fn=plate_fn,
            cap_uv=circ_uv)
    lw = G.sdf_to_loops(weight_fn(grid.X, grid.Y), grid, tol=0.001, max_len=0.5)
    G.sweep(bm, lw, [(0.06, z_b), (0.0, z_b + 0.06), (0.0, z_d - 0.03), (0.03, z_d)], sdf_fn=weight_fn, cap_uv=circ_uv)
    # bearing + centre screw
    G.revolve(bm, G.fillet([(0.0, z_plate_b - 0.12), (1.55, z_plate_b - 0.12), (1.55, z_d + 0.04), (0.0, z_d + 0.04)],
                           [0, 0.06, 0.02, 0], segs=[0, 2, 1, 0]), 48, mat_fn=lambda k: 1)
    slotted_screw(bm, 0.0, 0.0, z_plate_b - 0.12, r_head=0.85, h=0.10, mat=1, shank=0)
    G.transform_bm(bm, Matrix.Translation((0, 0, -zc)))
    return G.finalize_mesh_object("rotor", bm, coll, [M["m_gilt"], M["m_movement_steel"]], location=(0, 0, zc),
                                  sharp_angle=35.0)


BUILDERS = [build_mainplate, build_bridges, build_jewels, build_barrel, build_wheels, build_pallet_fork,
            build_balance, build_hairspring, build_rotor]
