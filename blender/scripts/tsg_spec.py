# tsg_spec.py -- single source of truth for dimensions, layout and part metadata (WATCH_SPEC.md).
import math

ROOT = r"D:\Titan - 3D - site"
TEX_DIR = ROOT + r"\blender\textures"
HDRI = ROOT + r"\blender\hdri\monochrome_studio_04_2k.hdr"
LOGO_SRC = ROOT + r"\brand\titan-logo.png"

# ---------------------------------------------------------------- case (mm)
CASE_R = 20.5            # case middle radius (41.0)
LUG_TIP_Y = 24.0         # lug-to-lug 48.0
LUG_INNER_X = 10.1       # 20.2 between lugs (20 mm strap + clearance)
LUG_TIP_OUTER_X = 12.60  # lug tip width 2.5
LUG_ROOT_OUTER_X = 14.2
CASE_TOP_Z = 2.40
CASE_BOT_Z = -4.70
CHAMFER = 0.50           # polished top chamfer
BEZEL_R_OUT = 19.50
BEZEL_R_IN = 17.32       # = crystal radius (bore)
BEZEL_TOP_Z = 3.40
CRYSTAL_R = 17.30
CRYSTAL_EDGE_TOP = 3.60
CRYSTAL_APEX = 4.20
CRYSTAL_BOT_EDGE = 2.20
CRYSTAL_BOT_APEX = 2.60
DIAL_R = 16.80
DIAL_Z0, DIAL_Z1 = -0.40, 0.0
CROWN_Z = -1.50
CROWN_R = 3.00
CASEBACK_FACE_Z = -6.80
MEDALLION_R = 13.0
CB_SCREW_R = 16.15
CB_SCREW_ANGLES = [45.0, 135.0, 225.0, 315.0]

# ---------------------------------------------------------------- hands / indices
HAND_Z = {"hour": 0.70, "minute": 1.10, "seconds": 1.60}
HAND_LEN = {"hour": 10.5, "minute": 15.2, "seconds": 16.0}
SECONDS_TAIL = 4.0
INDEX_R0, INDEX_R1 = 11.55, 14.75
INDEX_W = 0.92
INDEX_H = 0.50
TRACK_R0, TRACK_R1 = 15.30, 16.45
LOGO_W = 6.5
LOGO_CY = 8.6

# ---------------------------------------------------------------- movement
MVT_R = 15.0
MP_Z0, MP_Z1 = -0.60, -1.50          # mainplate base (dial side -> back face)
RIM_Z = -3.60                        # mainplate rim / pillars top = bridge underside
BRIDGE_Z0, BRIDGE_Z1 = -3.60, -4.15  # bridge underside, visible top (back) face
COCK_Z0, COCK_Z1 = -3.72, -4.25
ROTOR_Z0, ROTOR_Z1 = -4.35, -4.98

# layers (wheel disc mid-planes), thickness
WHEEL_T = 0.20
L1, L2, L3, L4 = -1.75, -2.15, -2.55, -2.93
BAL_RIM_Z0, BAL_RIM_Z1 = -3.10, -3.45
HS_Z = -3.62


def _p(r, deg, origin=(0.0, 0.0)):
    a = math.radians(deg)
    return (origin[0] + r * math.cos(a), origin[1] + r * math.sin(a))


C = (0.0, 0.0)
T = _p(5.40, -35.0)
F = _p(4.675, -110.0, T)
E = _p(4.095, 165.0, F)
P = _p(2.80, 180.0, E)
W = _p(4.00, 180.0, P)
B = _p(5.88, 120.0)

TRAIN = {
    # name: (pos, wheel teeth, module, pinion leaves, pinion module, wheel layer z, pinion z (meshing))
    "barrel": dict(pos=B, teeth=72, m=0.14, pinion=0, pm=0.0, z=None),
    "wheel_center": dict(pos=C, teeth=80, m=0.12, pinion=12, pm=0.14, z=L1),
    "wheel_third": dict(pos=T, teeth=75, m=0.11, pinion=10, pm=0.12, z=L2),
    "wheel_fourth": dict(pos=F, teeth=84, m=0.09, pinion=10, pm=0.11, z=L3),
    "wheel_escape": dict(pos=E, teeth=20, m=0.0, pinion=7, pm=0.09, z=L4),
}
BARREL_TEETH_Z = (-1.90, -2.20)  # barrel toothed rim (dial side) = centre pinion Z

# ---------------------------------------------------------------- strap
STRAP_W0, STRAP_W1 = 20.0, 18.0
SPRING_BAR_Y = 22.0
SPRING_BAR_Z = -1.15

# ---------------------------------------------------------------- render hand pose (10:10:35)
POSE_TIME = (10, 10, 35)

# ---------------------------------------------------------------- part metadata (WATCH_SPEC section 3)
AR = {
    "strap_a": "السوار، جهة الإبزيم", "strap_b": "السوار، الطرف الحر", "buckle": "الإبزيم",
    "caseback_screw": "برغي الغطاء الخلفي", "caseback": "الغطاء الخلفي", "gasket": "حلقة العزل",
    "crown": "التاج", "crown_tube": "أنبوب التاج", "rotor": "الدوّار",
    "mvmt_bridge_01": "جسر البرميل", "mvmt_bridge_02": "جسر العجلات", "mvmt_bridge_03": "جسر الميزان",
    "jewels": "أحجار الياقوت", "barrel": "برميل النابض", "wheel_center": "العجلة المركزية",
    "wheel_third": "العجلة الثالثة", "wheel_fourth": "العجلة الرابعة", "wheel_escape": "عجلة الانفلات",
    "pallet_fork": "المرساة", "balance_wheel": "عجلة الميزان", "hairspring": "النابض الشعري",
    "mvmt_mainplate": "اللوحة الرئيسية", "dial": "الميناء الشمسي", "index": "مؤشر الساعات",
    "logo_plate": "الشعار", "hand_hour": "عقرب الساعات", "hand_minute": "عقرب الدقائق",
    "hand_seconds": "عقرب الثواني", "crystal": "الكريستال الياقوتي", "bezel": "الإطار", "case_body": "العلبة",
}


def _row(name, group, order, axis, dist, en, ar, finish):
    return dict(name=name, group=group, explode_order=order, explode_axis=list(axis),
                explode_distance=float(dist), label_en=en, label_ar=ar, finish=finish)


def part_table():
    rows = [
        _row("strap_a", "strap", 1, (0, 1, 0), 34, "Strap, buckle side", AR["strap_a"], "strap"),
        _row("strap_b", "strap", 1, (0, -1, 0), 34, "Strap, tail side", AR["strap_b"], "strap"),
        _row("buckle", "strap", 2, (0, 0.8, -0.6), 52, "Pin buckle", AR["buckle"], "case_metal"),
    ]
    for i in range(1, 5):
        rows.append(_row("caseback_screw_%02d" % i, "case", 3, (0, 0, -1), 58, "Caseback screw",
                         AR["caseback_screw"], "case_metal"))
    rows += [
        _row("caseback", "case", 4, (0, 0, -1), 48, "Caseback", AR["caseback"], "case_metal"),
        _row("gasket", "case", 4, (0, 0, -1), 40, "Gasket", AR["gasket"], "none"),
        _row("crown", "case", 5, (1, 0, 0), 16, "Crown", AR["crown"], "case_metal"),
        _row("crown_tube", "case", 5, (1, 0, 0), 8, "Crown tube", AR["crown_tube"], "case_metal"),
        _row("rotor", "movement", 5, (0, 0, -1), 34, "Rotor", AR["rotor"], "none"),
        _row("mvmt_bridge_01", "movement", 6, (0, 0, -1), 27, "Barrel bridge", AR["mvmt_bridge_01"], "none"),
        _row("mvmt_bridge_02", "movement", 6, (0, 0, -1), 27, "Train bridge", AR["mvmt_bridge_02"], "none"),
        _row("mvmt_bridge_03", "movement", 6, (0, 0, -1), 27, "Balance cock", AR["mvmt_bridge_03"], "none"),
        _row("jewels", "movement", 7, (0, 0, -1), 23, "Ruby jewels", AR["jewels"], "none"),
        _row("barrel", "movement", 7, (0, 0, -1), 19, "Mainspring barrel", AR["barrel"], "none"),
        _row("wheel_center", "movement", 7, (0, 0, -1), 19, "Centre wheel", AR["wheel_center"], "none"),
        _row("wheel_third", "movement", 7, (0, 0, -1), 19, "Third wheel", AR["wheel_third"], "none"),
        _row("wheel_fourth", "movement", 7, (0, 0, -1), 19, "Fourth wheel", AR["wheel_fourth"], "none"),
        _row("wheel_escape", "movement", 7, (0, 0, -1), 19, "Escape wheel", AR["wheel_escape"], "none"),
        _row("pallet_fork", "movement", 7, (0, 0, -1), 19, "Pallet fork", AR["pallet_fork"], "none"),
        _row("balance_wheel", "movement", 7, (0, 0, -1), 21, "Balance wheel", AR["balance_wheel"], "none"),
        _row("hairspring", "movement", 7, (0, 0, -1), 23, "Hairspring", AR["hairspring"], "none"),
        _row("mvmt_mainplate", "movement", 8, (0, 0, -1), 13, "Mainplate", AR["mvmt_mainplate"], "none"),
        _row("dial", "dial", 9, (0, 0, 1), 15, "Sunburst dial", AR["dial"], "dial"),
    ]
    for i in range(1, 13):
        rows.append(_row("index_%02d" % i, "dial", 10, (0, 0, 1), 20, "Applied index", AR["index"], "case_metal"))
    rows += [
        _row("logo_plate", "dial", 10, (0, 0, 1), 19, "Logo", AR["logo_plate"], "none"),
        _row("hand_hour", "hands", 11, (0, 0, 1), 25, "Hour hand", AR["hand_hour"], "case_metal"),
        _row("hand_minute", "hands", 11, (0, 0, 1), 29, "Minute hand", AR["hand_minute"], "case_metal"),
        _row("hand_seconds", "hands", 11, (0, 0, 1), 33, "Seconds hand", AR["hand_seconds"], "none"),
        _row("crystal", "case", 12, (0, 0, 1), 42, "Sapphire crystal", AR["crystal"], "none"),
        _row("bezel", "case", 13, (0, 0, 1), 50, "Bezel", AR["bezel"], "case_metal"),
        _row("case_body", "case", 0, (0, 0, 0), 0, "Case", AR["case_body"], "case_metal"),
    ]
    return rows


SPIN = {  # rev/hour, signed (+ = CCW seen from dial side)
    "barrel": 1.0 / 6.0, "wheel_center": -1.0, "wheel_third": 8.0, "wheel_fourth": -60.0, "wheel_escape": 720.0,
}
TEETH = {"barrel": (72, 0), "wheel_center": (80, 12), "wheel_third": (75, 10), "wheel_fourth": (84, 10),
         "wheel_escape": (20, 7)}
