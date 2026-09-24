import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { makeCircleTexture } from './makeCircleTexture'

const VERTEX_SHADER = `
  attribute float size;
  attribute vec3 color;
  // Named aNormal (not "normal") - THREE.ShaderMaterial auto-injects its own "attribute vec3
  // normal" declaration, and redeclaring that name breaks shader compilation.
  attribute vec3 aNormal;
  // 0 = not in a fold, 1 = deep in a fold (see computeFoldWeight.js) - unlike vFacing, this is a
  // fixed per-point property of the mesh, not something that changes as the model rotates.
  attribute float aFold;
  // 1 = this point's facing is judged as usual; 0 = always treated as front-facing (e.g. line-art
  // points sharing a cloud with a real mesh whose far side should fade).
  attribute float aUseNormal;
  varying vec3 vColor;
  varying float vFacing;
  varying float vFold;
  uniform float uBaseSize;
  uniform float uPixelScale;
  // 0 = use aNormal (a real mesh has actual surface orientation to test); 1 = a line-art model
  // has no surface at all, so "facing" is approximated instead by whether a point sits nearer to
  // the camera than the model's own center - a cheap stand-in depth cue that still updates
  // correctly as the model rotates.
  uniform float uUseDepthFacing;
  void main() {
    vColor = color;
    vFold = aFold;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // dot of the (view-space) surface normal with the direction back to the camera: positive
    // means this point faces the camera, negative means it's on the model's far side.
    vec3 viewNormal = normalize(normalMatrix * aNormal);
    vec3 viewDir = normalize(-mvPosition.xyz);
    float normalFacing = dot(viewNormal, viewDir);
    float centerViewZ = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).z;
    float depthFacing = mvPosition.z - centerViewZ; // > 0: nearer than center (view -Z is forward)
    // Ternary, not mix(): a masked-out point's normal may be zero -> NaN, and mix(1.0, NaN, 0.0) is NaN.
    vFacing = aUseNormal > 0.5 ? mix(normalFacing, depthFacing, uUseDepthFacing) : 1.0;
    gl_PointSize = size * uBaseSize * (uPixelScale / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform sampler2D uMap;
  uniform float uBackOpacity;
  uniform float uFrontWhiteFade;
  uniform float uBackWhiteFade;
  uniform float uFoldWhiteFade;
  varying vec3 vColor;
  varying float vFacing;
  varying float vFold;
  // three.js's color management (on by default since r152) converts a THREE.Color(hex) to linear
  // space internally, so the 'color' vertex attribute (and vColor here) is linear, not sRGB. Built-
  // in materials get an automatic linear-to-sRGB pass injected into their shader; a bare
  // ShaderMaterial like this one does not, so without this the renderer writes linear values
  // straight to the (sRGB) framebuffer and every color comes out visibly darker/duller than the
  // hex it was given.
  vec3 linearToSRGB(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    if (tex.a < 0.5) discard; // hard cutoff keeps the circle edge clean instead of blurry
    bool front = vFacing >= 0.0;
    // A fold point blends toward white same as a back-facing one would - whichever fade is
    // stronger wins, so a back-facing fold point doesn't get double-blended past uFoldWhiteFade.
    float whiteFade = max(front ? uFrontWhiteFade : uBackWhiteFade, vFold * uFoldWhiteFade);
    vec3 color = mix(vColor, vec3(1.0), whiteFade); // blended in linear space - more physically correct
    // Front-facing particles are always fully opaque, no exceptions.
    float alpha = front ? 1.0 : uBackOpacity;
    gl_FragColor = vec4(linearToSRGB(color), alpha);
  }
`

/**
 * Shared renderer for a mesh-derived particle cloud: circular point sprites with
 * perspective-correct sizing (mirrors THREE.PointsMaterial's sizeAttenuation, done by hand since
 * a custom ShaderMaterial doesn't get that for free), plus an optional line-segments overlay.
 * Points facing away from the camera get a depth cue instead of looking identical to the near
 * side - blended toward white by `backWhiteFade` and/or faded to `backOpacity` (translucent). The
 * near side can independently be lightened toward white by `frontWhiteFade` - front-facing
 * particles are always fully opaque, though. "Facing" itself comes from a real `normals` buffer
 * (a surface's own orientation) by default, or - pass `depthFacing` - from whether a point sits
 * nearer the camera than the model's own center, for a line-art model with no real surface to
 * test; omit both to disable all of the above. Separately, points in a concave fold of the mesh
 * (per `foldWeights`, from
 * computeFoldWeight.js) blend toward white by `foldWhiteFade` regardless of facing or rotation
 * (never past whatever the facing-based fade would already give it); omit it to disable.
 *
 * Purely presentational - `positions`/`sizes`/`colors`/`normals`/`edgePositions`/`foldWeights`
 * come from extractMeshGeometry.js / sampleLineStrips.js / computeFoldWeight.js + particleColors.js.
 *
 * Pass `depthWrite` once the cloud is fully opaque (no real `backOpacity` in play) so points
 * properly occlude each other by distance instead of by draw order - see the prop's own comment.
 */
export default function ParticleMesh({
  positions,
  sizes,
  colors,
  normals,
  foldWeights,
  normalMask,
  edgePositions,
  particleSize,
  edgeColor,
  edgeOpacity = 0.5,
  backOpacity = 1,
  frontWhiteFade = 0,
  backWhiteFade = 0,
  foldWhiteFade = 0,
  // See the uUseDepthFacing comment in VERTEX_SHADER - set true for a line-art model with no
  // usable surface normals.
  depthFacing = false,
  // Points don't self-sort by distance within a single draw call, so with this off (the default,
  // for a cloud that's genuinely translucent via backOpacity) a far point can draw after - and so
  // blend visibly on top of - a near one. Pass true once every point ends up fully opaque (no
  // backOpacity in play) so the GPU depth-tests/writes each point instead, correctly hiding
  // whatever's behind it regardless of draw order.
  depthWrite = false,
}) {
  const { size, camera } = useThree()
  const circleTexture = useMemo(() => makeCircleTexture(), [])
  const pixelScale = size.height / (2 * Math.tan((camera.fov * Math.PI) / 360))

  // Default: every point "faces the camera", so the back-fade effect is a no-op unless the
  // caller supplies real normals.
  const effectiveNormals = useMemo(() => {
    if (normals) return normals
    const n = new Float32Array(positions.length)
    for (let i = 2; i < n.length; i += 3) n[i] = 1
    return n
  }, [normals, positions])

  // Default: no point is "in a fold", so the fixed-opacity effect is a no-op unless the caller
  // supplies real fold weights.
  const effectiveFold = useMemo(() => {
    if (foldWeights) return foldWeights
    return new Float32Array(positions.length / 3)
  }, [foldWeights, positions])

  const effectiveMask = useMemo(() => {
    if (normalMask) return normalMask
    return new Float32Array(positions.length / 3).fill(1)
  }, [normalMask, positions])

  return (
    <group>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aNormal" args={[effectiveNormals, 3]} />
          <bufferAttribute attach="attributes-aFold" args={[effectiveFold, 1]} />
          <bufferAttribute attach="attributes-aUseNormal" args={[effectiveMask, 1]} />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={depthWrite}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={{
            uMap: { value: circleTexture },
            uBaseSize: { value: particleSize },
            uPixelScale: { value: pixelScale },
            uBackOpacity: { value: backOpacity },
            uFrontWhiteFade: { value: frontWhiteFade },
            uBackWhiteFade: { value: backWhiteFade },
            uFoldWhiteFade: { value: foldWhiteFade },
            uUseDepthFacing: { value: depthFacing ? 1 : 0 },
          }}
        />
      </points>

      {edgePositions && edgePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  )
}
