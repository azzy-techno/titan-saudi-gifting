# tsg_textures.py -- procedural textures (numpy) -> PNG in blender/textures/.
# Conventions: arrays are (rows=v, cols=u), row 0 = v=0 (bottom), as Blender expects.
# Normal maps are tangent space, OpenGL convention (+Y green up), 8-bit PNG.
import math
import os
import numpy as np
import bpy

import tsg_spec as S

TEX = S.TEX_DIR


def _save_png(name, rgba):
    os.makedirs(TEX, exist_ok=True)
    h, w = rgba.shape[:2]
    if rgba.shape[2] == 3:
        rgba = np.concatenate([rgba, np.ones((h, w, 1), dtype=np.float32)], axis=2)
    img = bpy.data.images.new("__tex_" + name, w, h, alpha=True, float_buffer=False)
    img.pixels.foreach_set(np.clip(rgba, 0, 1).astype(np.float32).ravel())
    path = os.path.join(TEX, name + ".png")
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    return path


def _normal_from_height(h, strength_u, strength_v=None, wrap=True):
    """h in arbitrary units; strength = d(normal xy)/d(h per pixel)."""
    if strength_v is None:
        strength_v = strength_u
    if wrap:
        du = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
        dv = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5
    else:
        dv, du = np.gradient(h)
    nx = -du * strength_u
    ny = -dv * strength_v
    nz = np.ones_like(h)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.stack([nx * inv, ny * inv, nz * inv], axis=2)
    return (n * 0.5 + 0.5).astype(np.float32)


def _spectral_noise(shape, ku_band, kv_band, seed, power=1.0):
    """Periodic band-limited noise. ku/kv bands in cycles per pixel (abs)."""
    rng = np.random.default_rng(seed)
    hgt, wid = shape
    white = rng.standard_normal(shape)
    Fw = np.fft.fft2(white)
    ku = np.abs(np.fft.fftfreq(wid))[None, :]
    kv = np.abs(np.fft.fftfreq(hgt))[:, None]
    fu = ((ku >= ku_band[0]) & (ku <= ku_band[1])).astype(float) * (1.0 / np.maximum(ku, 1e-6) ** (0.5 * power))
    fv = np.exp(-(kv / max(kv_band[1], 1e-6)) ** 2)
    filt = fu * fv
    n = np.real(np.fft.ifft2(Fw * filt))
    n -= n.mean()
    n /= (n.std() + 1e-12)
    return n


def _tilt_strength(h, max_tilt_deg):
    g = np.abs(np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    g99 = np.percentile(g, 99.0) + 1e-12
    return math.tan(math.radians(max_tilt_deg)) / g99


# ----------------------------------------------------------------------------- brushed
def brushed(size=1024, seed=11):
    h = _spectral_noise((size, size), (1 / 24.0, 1 / 2.5), (0, 1 / 300.0), seed, power=1.2)
    # sparse deeper scratches
    rng = np.random.default_rng(seed + 1)
    cols = rng.integers(0, size, 40)
    for c in cols:
        amp = rng.uniform(1.5, 3.0)
        h[:, c] -= amp * (0.6 + 0.4 * np.sin(np.linspace(0, rng.uniform(2, 6) * math.pi, size)))
    s = _tilt_strength(h, 4.0)
    nrm = _normal_from_height(h, s, s * 0.3)
    return _save_png("brushed_normal", nrm)


# ----------------------------------------------------------------------------- dial (polar UV)
DIAL_R_IN = 0.55


def dial_polar_v_to_r(v):
    return DIAL_R_IN + v * (S.DIAL_R - DIAL_R_IN)


def sunburst(w=4096, h=256, seed=21):
    n = _spectral_noise((h, w), (1 / 14.0, 1 / 2.2), (0, 1 / 200.0), seed, power=1.0)
    # visible streaks: ~150-700 radial lines per revolution, varying in depth along the radius
    n += 1.6 * _spectral_noise((h, w), (1 / 28.0, 1 / 6.0), (0, 1 / 60.0), seed + 5, power=0.6)
    s = _tilt_strength(n, 6.0)
    nrm = _normal_from_height(n, s, s * 0.15)
    return _save_png("dial_sunburst_normal", nrm)


def dial_print(w=4096, h=512, ss=3):
    """Base colour (graphite + bone-white minute track), metallic/roughness packed (G=rough, B=metal)."""
    # supersampled coverage of the print
    us = (np.arange(w * ss) + 0.5) / (w * ss)
    vs = (np.arange(h * ss) + 0.5) / (h * ss)
    U, V = np.meshgrid(us, vs)
    th = U * 2 * math.pi
    r = dial_polar_v_to_r(V)
    # angle of each tick k: 90deg - 6deg*k (clockwise from 12)
    ang_cw = (math.pi / 2 - th) % (2 * math.pi)           # clockwise angle from 12
    k = np.round(ang_cw / (2 * math.pi / 60)).astype(int) % 60
    dth = ang_cw - k * (2 * math.pi / 60)
    dth = (dth + math.pi) % (2 * math.pi) - math.pi
    perp = np.abs(r * np.sin(dth))
    five = (k % 5 == 0)
    half_w = np.where(five, 0.16, 0.065)
    r0 = np.where(five, S.TRACK_R0, 15.88)
    r1 = S.TRACK_R1
    tick = (perp <= half_w) & (r >= r0) & (r <= r1)
    ring = np.abs(r - 16.58) <= 0.035
    cov = (tick | ring).astype(np.float32)
    cov = cov.reshape(h, ss, w, ss).mean(axis=(1, 3))
    # graphite base with very slight radial variation (lacquer depth)
    rr = dial_polar_v_to_r((np.arange(h) + 0.5) / h)[:, None]
    graphite = np.array([0.325, 0.335, 0.355])  # sRGB (linear F0 ~0.07-0.09: dark graphite metal)
    g = np.ones((h, w, 3)) * graphite[None, None, :]
    g *= (1.0 - 0.10 * (rr / S.DIAL_R) ** 2)[..., None]
    bone = np.array([0.925, 0.906, 0.874])
    col = g * (1 - cov[..., None]) + bone[None, None, :] * cov[..., None]
    _save_png("dial_basecolor", col.astype(np.float32))
    rough = 0.43 * (1 - cov) + 0.55 * cov
    metal = 1.0 * (1 - cov)
    mr = np.stack([np.zeros_like(rough), rough, metal], axis=2).astype(np.float32)
    return _save_png("dial_metal_rough", mr)


# ----------------------------------------------------------------------------- perlage
def perlage(size=1024, tile_mm=9.0, spot_d=1.15, pitch=0.75, seed=31):
    px = tile_mm / size
    n = int(round(tile_mm / pitch))
    pitch = tile_mm / n
    H = np.zeros((size, size), dtype=np.float64)
    yy, xx = np.mgrid[0:size, 0:size]
    X = (xx + 0.5) * px
    Y = (yy + 0.5) * px
    R = spot_d / 2.0
    rng = np.random.default_rng(seed)
    order = []
    for j in range(n):
        for i in range(n):
            cx = (i + 0.5 * (j % 2)) * pitch
            cy = j * pitch
            order.append((cx, cy))
    for (cx, cy) in order:
        dx = (X - cx + tile_mm / 2) % tile_mm - tile_mm / 2
        dy = (Y - cy + tile_mm / 2) % tile_mm - tile_mm / 2
        d = np.hypot(dx, dy)
        m = d < R
        if not m.any():
            continue
        f = rng.uniform(16, 34, 6)
        ph = rng.uniform(0, 2 * math.pi, 6)
        a = rng.uniform(0.4, 1.0, 6)
        dd = d[m]
        val = sum(a[k] * np.sin(2 * math.pi * f[k] * dd + ph[k]) for k in range(6))
        val += 0.6 * np.sin(np.arctan2(dy[m], dx[m]) * rng.integers(1, 3) + rng.uniform(0, 6.28)) * (dd / R)
        H[m] = val
    s = _tilt_strength(H, 9.0)
    nrm = _normal_from_height(H, s)
    return _save_png("perlage_normal", nrm)


# ----------------------------------------------------------------------------- cotes de geneve
def cotes(size=1024, tile_mm=10.0, band=2.5, radius=3.6, seed=41):
    px = tile_mm / size
    yy, xx = np.mgrid[0:size, 0:size]
    X = (xx + 0.5) * px
    Y = (yy + 0.5) * px
    k = np.floor(X / band)
    xc = (k + 0.5) * band
    # arcs: scratch coordinate along the band, curved (overlap edge at band boundary)
    t = Y - (X - xc) ** 2 / (2 * radius) - 0.25 * (X - xc)
    rng = np.random.default_rng(seed)
    H = np.zeros_like(X)
    L = tile_mm
    for i in range(10):
        f = rng.integers(60, 260)  # cycles per tile (periodic)
        H += rng.uniform(0.3, 1.0) * np.sin(2 * math.pi * f * t / L + rng.uniform(0, 6.28) + k * 1.7)
    # subtle step at the band edge (overlap of the next band)
    edge = ((X - k * band) / band)
    H += 10.0 * edge          # slight tilt across each band -> alternating bright/dark stripes
    s = _tilt_strength(H, 8.0)
    nrm = _normal_from_height(H, s)
    return _save_png("cotes_normal", nrm)


# ----------------------------------------------------------------------------- circular graining
def circular(size=1024, span_mm=26.0, seed=51):
    px = span_mm / size
    yy, xx = np.mgrid[0:size, 0:size]
    X = (xx + 0.5) * px - span_mm / 2
    Y = (yy + 0.5) * px - span_mm / 2
    rho = np.hypot(X, Y)
    phi = np.arctan2(Y, X)
    rng = np.random.default_rng(seed)
    H = np.zeros_like(X)
    for i in range(14):
        f = rng.uniform(5.0, 17.0)
        H += rng.uniform(0.3, 1.0) * np.sin(2 * math.pi * f * rho + rng.uniform(0, 6.28)
                                            + 0.4 * np.sin(phi * rng.integers(1, 4) + rng.uniform(0, 6.28)))
    s = _tilt_strength(H, 5.0)
    nrm = _normal_from_height(H, s, wrap=False)
    return _save_png("circular_grain_normal", nrm)


# ----------------------------------------------------------------------------- leather
def leather(size=1024, tile_mm=8.0, cell=0.34, seed=61):
    rng = np.random.default_rng(seed)
    n = int(round(tile_mm / cell))
    cs = tile_mm / n
    pts = (np.stack(np.meshgrid(np.arange(n), np.arange(n)), -1).reshape(-1, 2) + rng.random((n * n, 2))) * cs
    px = tile_mm / size
    yy, xx = np.mgrid[0:size, 0:size]
    X = (xx + 0.5) * px
    Y = (yy + 0.5) * px
    F1 = np.full(X.shape, 1e9)
    F2 = np.full(X.shape, 1e9)
    for (qx, qy) in pts:
        dx = (X - qx + tile_mm / 2) % tile_mm - tile_mm / 2
        dy = (Y - qy + tile_mm / 2) % tile_mm - tile_mm / 2
        d = dx * dx + dy * dy
        m = d < F1
        F2 = np.where(m, F1, np.minimum(F2, d))
        F1 = np.where(m, d, F1)
    F1 = np.sqrt(F1)
    F2 = np.sqrt(F2)
    crease = np.clip((F2 - F1) / (cs * 0.35), 0, 1)        # 0 at cell borders
    H = np.sqrt(crease) * 1.0
    # wrinkles and pores
    H += 0.35 * _spectral_noise((size, size), (1 / 90.0, 1 / 12.0), (0, 1 / 40.0), seed + 1)
    pores = _spectral_noise((size, size), (1 / 6.0, 1 / 2.5), (0, 0.5), seed + 2)
    H -= 0.25 * np.clip(pores - 1.8, 0, None)
    s = _tilt_strength(H, 22.0)
    nrm = _normal_from_height(H, s)
    _save_png("leather_normal", nrm)
    rough = np.clip(0.46 + 0.15 * (1 - crease) + 0.04 * _spectral_noise((size, size), (1 / 200.0, 1 / 20.0), (0, 1 / 20.0), seed + 3), 0, 1)
    mr = np.stack([np.zeros_like(rough), rough, np.zeros_like(rough)], 2).astype(np.float32)
    _save_png("leather_rough", mr)
    tone = np.clip(0.86 + 0.14 * crease + 0.03 * _spectral_noise((size, size), (1 / 300.0, 1 / 30.0), (0, 1 / 30.0), seed + 4), 0, 1)
    col = np.stack([tone, tone, tone], 2).astype(np.float32)
    return _save_png("leather_tone", col)


# ----------------------------------------------------------------------------- logo
def logo_alpha():
    """brand/titan-logo.png (black on white) -> white + alpha, cropped to content (no tracing)."""
    src = bpy.data.images.load(S.LOGO_SRC, check_existing=False)
    w, h = src.size
    px = np.empty(w * h * 4, dtype=np.float32)
    src.pixels.foreach_get(px)
    bpy.data.images.remove(src)
    px = px.reshape(h, w, 4)
    lum = px[..., :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    a = np.clip((1.0 - lum - 0.02) / 0.96, 0.0, 1.0) * px[..., 3]
    ys, xs = np.nonzero(a > 0.08)
    pad = 6
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, h)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, w)
    a = a[y0:y1, x0:x1]
    hh, ww = a.shape
    rgba = np.ones((hh, ww, 4), dtype=np.float32)
    rgba[..., 3] = a
    path = _save_png("logo_alpha", rgba)
    return path, (ww, hh), (int(x0), int(y0), int(x1), int(y1))


def build_all(force=False):
    jobs = [("brushed_normal", brushed), ("dial_sunburst_normal", sunburst), ("dial_metal_rough", dial_print),
            ("perlage_normal", perlage), ("cotes_normal", cotes), ("circular_grain_normal", circular),
            ("leather_tone", leather)]
    done = []
    for name, fn in jobs:
        if force or not os.path.exists(os.path.join(TEX, name + ".png")):
            fn()
            done.append(name)
    info = logo_alpha()
    return {"generated": done, "logo": info[1:]}


# ----------------------------------------------------------------------------- engraving (QC2 caseback render)
def _blur(a, r):
    """Separable box blur x3 (~Gaussian), radius r px."""
    if r <= 0:
        return a
    k = 2 * r + 1
    for _ in range(3):
        c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), axis=1)
        a = (c[:, k:] - c[:, :-k]) / k
        c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), axis=0)
        a = (c[k:, :] - c[:-k, :]) / k
    return a


def engraving_maps(mask_name="engraving_mask.png", depth_tilt_deg=55.0):
    """engraving_mask.png (white = engraved, sharp/Pango) -> engraving_normal.png + engraving_rough.png
    (R = engraved mask, G = roughness). UV space = medallion UVs (u = 0.5 - x/26, v = 0.5 + y/26)."""
    img = bpy.data.images.load(os.path.join(TEX, mask_name), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    m = px.reshape(h, w, 4)[..., 0].astype(np.float64)
    soft = _blur(m, 2)
    H = -soft                                   # engraved = recessed
    g = np.abs(np.gradient(H)[1])
    s = math.tan(math.radians(depth_tilt_deg)) / (np.percentile(g[g > 1e-4], 98) if (g > 1e-4).any() else 1.0)
    nrm = _normal_from_height(H, s, wrap=False)
    _save_png("engraving_normal", nrm)
    frost = _blur(m, 1)
    rough = 0.27 * (1 - frost) + 0.80 * frost
    out = np.stack([frost, rough, np.zeros_like(rough)], 2).astype(np.float32)
    return _save_png("engraving_rough", out)
