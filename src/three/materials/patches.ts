import * as THREE from 'three'

/**
 * Shader patches (custom GLSL injected into three's PBR materials):
 *  - Light sweep: a soft specular band that travels across metal when a chapter headline reveals.
 *  - Engraving: canvas mask → recessed (bump), rougher, darker letters on the caseback medallion.
 */
export const sweepUniforms = {
  uSweepPos: { value: -2 },
  uSweepAmt: { value: 0 },
  uSweepDir: { value: new THREE.Vector2(0.86, 0.5).normalize() },
  uSweepWidth: { value: 0.09 },
  uSweepColor: { value: new THREE.Color('#fff4e2') },
}

export function patchSweep(material: THREE.MeshStandardMaterial, strength = 1) {
  const prev = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer)
    Object.assign(shader.uniforms, sweepUniforms, { uSweepStrength: { value: strength } })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSweepNdc;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvSweepNdc = gl_Position.xy / max(gl_Position.w, 1e-4);',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec2 vSweepNdc;
uniform float uSweepPos; uniform float uSweepAmt; uniform vec2 uSweepDir;
uniform float uSweepWidth; uniform vec3 uSweepColor; uniform float uSweepStrength;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
  float d = dot(vSweepNdc, uSweepDir) - uSweepPos;
  float band = exp(-(d * d) / (uSweepWidth * uSweepWidth));
  vec3 V = normalize(vViewPosition);
  float facing = pow(1.0 - clamp(abs(dot(normal, V)), 0.0, 1.0), 1.5);
  outgoingLight += uSweepColor * band * uSweepAmt * uSweepStrength * (0.35 + 0.65 * facing) * (0.4 + 0.6 * metalnessFactor);
}
#include <opaque_fragment>`,
      )
  }
  material.customProgramCacheKey = () => `sweep-${strength}`
  material.needsUpdate = true
}

export const engravingUniforms = {
  uEngraving: { value: null as THREE.Texture | null },
  uEngrAmt: { value: 0 },
  uEngrDepth: { value: 1.6 },
  uEngrFlash: { value: 0 },
}

/**
 * @param backAxis object-space normal of the engraved face (default −Z = caseback outer face in watch space)
 */
export function patchEngraving(material: THREE.MeshStandardMaterial, backAxis = new THREE.Vector3(0, 0, -1)) {
  const prev = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer)
    Object.assign(shader.uniforms, engravingUniforms, { uEngrAxis: { value: backAxis } })
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec2 vEngrUv;\nvarying float vEngrFace;\nuniform vec3 uEngrAxis;',
      )
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvEngrUv = uv;')
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nvEngrFace = step(0.92, dot(normalize(objectNormal), uEngrAxis));',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec2 vEngrUv; varying float vEngrFace;
uniform sampler2D uEngraving; uniform float uEngrAmt; uniform float uEngrDepth; uniform float uEngrFlash;
float engrMask() { return texture2D(uEngraving, vEngrUv).r * uEngrAmt * vEngrFace; }`,
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat engrM = engrMask();\ndiffuseColor.rgb *= mix(1.0, 0.58, engrM);',
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.64, engrM);',
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  // Same maths as three's perturbNormalArb (bump mapping from screen-space height derivatives)
  vec3 sx = normalize(dFdx(-vViewPosition));
  vec3 sy = normalize(dFdy(-vViewPosition));
  float h = -engrM * uEngrDepth;
  vec2 dh = vec2(dFdx(h), dFdy(h));
  vec3 r1 = cross(sy, normal); vec3 r2 = cross(normal, sx);
  float det = dot(sx, r1) * faceDirection;
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  normal = normalize(abs(det) * normal - grad);
}`,
      )
      .replace(
        '#include <opaque_fragment>',
        'outgoingLight += vec3(1.0, 0.93, 0.82) * engrM * uEngrFlash * 0.6;\n#include <opaque_fragment>',
      )
  }
  material.customProgramCacheKey = () => 'engraving'
  material.needsUpdate = true
}
