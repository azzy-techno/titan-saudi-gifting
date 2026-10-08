import { Effect, BlendFunction } from 'postprocessing'
import { Uniform, Vector2, type Texture } from 'three'

/**
 * Jeweller's loupe. The magnified image is a REAL re-render of the sub-region under the cursor
 * (camera.setViewOffset into a small render target), composited here with a gentle barrel
 * distortion, a hint of lateral colour at the rim and a polished bezel ring.
 */
const fragment = /* glsl */ `
uniform sampler2D uMag;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uAspect;
uniform float uActive;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 d = (uv - uCenter) * vec2(uAspect, 1.0);
  float r = length(d) / max(uRadius, 1e-4);
  if (uActive < 0.001 || r > 1.1) { outputColor = inputColor; return; }
  vec2 local = d / max(uRadius, 1e-4);
  float barrel = 1.0 - 0.1 * dot(local, local);
  vec2 muv = 0.5 + 0.5 * local * barrel;
  float ca = 0.006 * smoothstep(0.6, 1.0, r);
  vec3 mag;
  mag.r = texture2D(uMag, muv + local * ca).r;
  mag.g = texture2D(uMag, muv).g;
  mag.b = texture2D(uMag, muv - local * ca).b;
  float inside = 1.0 - smoothstep(0.965, 0.985, r);
  vec3 col = mix(inputColor.rgb, mag, inside * uActive);
  // inner shadow of the loupe barrel
  col *= 1.0 - 0.42 * smoothstep(0.72, 0.985, r) * inside * uActive;
  // polished bezel ring
  float ring = smoothstep(0.972, 0.99, r) * (1.0 - smoothstep(1.0, 1.035, r));
  col += vec3(1.0, 0.94, 0.84) * ring * 0.55 * uActive;
  outputColor = vec4(col, inputColor.a);
}
`

export class LoupeEffect extends Effect {
  constructor() {
    super('LoupeEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['uMag', new Uniform(null)],
        ['uCenter', new Uniform(new Vector2(0.5, 0.5))],
        ['uRadius', new Uniform(0.12)],
        ['uAspect', new Uniform(1)],
        ['uActive', new Uniform(0)],
      ]),
    })
  }

  set magTexture(t: Texture | null) {
    this.uniforms.get('uMag')!.value = t
  }
  get center(): Vector2 {
    return this.uniforms.get('uCenter')!.value as Vector2
  }
  set radius(v: number) {
    this.uniforms.get('uRadius')!.value = v
  }
  set aspect(v: number) {
    this.uniforms.get('uAspect')!.value = v
  }
  set active(v: number) {
    this.uniforms.get('uActive')!.value = v
  }
  get active(): number {
    return this.uniforms.get('uActive')!.value as number
  }
}
