# ECO Guardian — Visual Upgrade Plan

## Current State Assessment

| Element | Current Approach | Limitation |
|---|---|---|
| Ground | 64×64 canvas texture on flat plane | Static, no depth or animation |
| Landmarks | Instanced voxels (BoxGeometry) | Good geometry, lacks atmospheric effects |
| Props | 2D billboard sprites | Flat, no lighting response |
| Lighting | 1 ambient + 1 directional | No atmosphere, no depth |
| Background | None (canvas shows through) | Looks broken, especially on Void theme |

---

## Upgrade Priorities

### Priority 1 — Post-Processing (Bloom + Vignette)
**Effort: Low | Visual Impact: Very High**

Library: `@react-three/postprocessing`

- Wrap the `<Canvas>` scene with `<EffectComposer>`
- Add `<Bloom luminanceThreshold={0.3} intensity={1.5} />`
- Add `<Vignette eskil={false} offset={0.1} darkness={0.5} />`

Why it works: Landmarks already use `emissive` colors on their animated elements (fireflies, lava particles, Void orb, cyber streams). Bloom makes all of these actually glow. The portals (which have bright neon colors) will look dramatic. This is the single highest-impact change.

Optional per-theme tuning:
- Void / Cyber: Higher bloom intensity
- Forest / Desert: Lower, warmer bloom
- Hell: Red-tinted bloom via `mipmapBlur`

---

### Priority 2 — Per-Theme Fog
**Effort: Very Low | Visual Impact: High**

Add `<fog attach="fog" color={fogColor} near={25} far={65} />` inside the scene, driven by `themeId`.

Suggested fog colors per theme:

| Theme | Fog Color | Effect |
|---|---|---|
| FOREST | `#166534` | Green mist |
| SKULL | `#1e293b` | Eerie grey |
| ICE | `#e0f2fe` | Blinding white |
| VOLCANO | `#450a0a` | Smoky red |
| PYRAMID | `#92400e` | Sandy haze |
| MUSHROOM | `#3f6212` | Swamp murk |
| CYBER | `#020617` | Dark digital |
| VOID | `#2e1065` | Deep purple |
| SKY | `#bae6fd` | Open sky |
| HELL | `#7f1d1d` | Hellfire red |

---

### Priority 3 — Sky / Background
**Effort: Low | Visual Impact: High**

Library: `@react-three/drei` — `Sky`, `Stars`

- Default: `<Sky sunPosition={[100, 20, 100]} />` (daytime)
- VOID / HELL / SKULL: `<Stars radius={80} depth={50} count={3000} factor={4} fade />`
- SKY theme: `<Sky sunPosition={[0, 1, 0]} turbidity={0.5} />` (bright noon sky)
- CYBER: Dark background, no sky — use scene background color `#020617`

Set per-theme background color on the Three.js scene: `scene.background = new THREE.Color(themeColor)`

---

### Priority 4 — Animated Ground Shaders (2–3 Key Themes)
**Effort: Medium | Visual Impact: High**

Replace `meshStandardMaterial` on the ground plane with a custom `ShaderMaterial` for select themes. Use `useFrame` to pass `uTime` uniform.

High-priority themes for animated shaders:

**VOLCANO** — Lava flow
- UV distortion using `sin(uv.x * 10.0 + uTime)` shifts the lava vein texture
- Intersection glow pulses with `abs(sin(uTime * 2.0))`

**VOID** — Twinkling star field
- Procedural stars using `fract(sin(dot(uv, vec2(12.9, 78.2))) * 43758.5)` noise
- Stars fade in/out using `sin(uTime + starId)`

**CYBER** — Scrolling neon grid
- UV offset `uv.y += uTime * 0.1` makes grid lines scroll
- Scanline effect using `mod(uv.y, 0.1)` 

**ICE** — Sparkle glints
- Randomly placed bright spots that fade: combine noise with `abs(sin(uTime * 3.0 + id))`

Other themes can keep the canvas texture approach — it works fine for FOREST, PYRAMID, SKY, etc.

---

### Priority 5 — Hemisphere Light
**Effort: Very Low | Visual Impact: Medium**

Replace or supplement the `ambientLight` with a `hemisphereLight`:

```tsx
<hemisphereLight skyColor={themeSkyColor} groundColor={themeGroundColor} intensity={0.6} />
<directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
```

This gives voxels a top-lit vs. bottom-shaded gradient that reads as real depth, for free.

Per-theme sky/ground color pairs:
- FOREST: sky `#86efac`, ground `#451a03`
- VOLCANO: sky `#ef4444`, ground `#292524`
- VOID: sky `#8b5cf6`, ground `#1e1b4b`
- ICE: sky `#e0f2fe`, ground `#67e8f9`

---

### Priority 6 — Shadow Casting on Voxels
**Effort: Low | Visual Impact: Medium**

The `StaticVoxelBatch` instanced mesh already has `castShadow receiveShadow`. The ground plane has `receiveShadow`. The directional light has `castShadow`. But the shadow map resolution is `[1024, 1024]` — increase to `[2048, 2048]` and tighten `shadow-camera-near/far` bounds for cleaner shadows.

---

## Implementation Order

1. Install `@react-three/postprocessing` if not present
2. Add Bloom + Vignette to `Scene.tsx` (wrap existing JSX in `<EffectComposer>`)
3. Add fog inside the scene group in `Scene.tsx`, driven by `themeId`
4. Add sky/stars in the same conditional block as `PixelGround`
5. Add hemisphere light
6. Implement animated shaders in `PixelGround.tsx` for VOLCANO and VOID first

## Files to Modify

- [Scene.tsx](../components/game/Scene.tsx) — fog, sky, lighting, post-processing wrapper
- [PixelGround.tsx](../components/game/PixelGround.tsx) — animated shaders for select themes
- `package.json` — add `@react-three/postprocessing` if missing
