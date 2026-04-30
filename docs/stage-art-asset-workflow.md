# Stage Art Asset Workflow

Use this workflow when creating or revising visual assets for a stage. The goal
is to keep the richer image-generated look while preserving the readable,
cartoon pixel-art feel of the original deterministic assets.

## Codex Skills

- Use `$generate2dmap` at the start of a new stage art pass to choose the stage
  asset pipeline: ground variants, prop pack shape, runtime contract, collision
  assumptions, and validation plan.
- Use `$imagegen` for the creative raster assets themselves: ground tile
  variants, prop sheets, reference images, and visual revisions.
- Keep the project runtime contract in this document as the source of truth.
  Skills help generate and process assets, but they should not introduce new
  filenames, separate battle ground copies, or different prop sizes unless the
  runtime is intentionally changed.

## Runtime Contract

Ground tiles:

- Save shared ground tiles in `public/assets/images/ground/`.
- Use `_overworld` filenames only. Overworld and battle both resolve to the same
  files through `assets.ts`.
- Provide up to four variants:
  - `{theme}_overworld.png`
  - `{theme}_overworld_v2.png`
  - `{theme}_overworld_v3.png`
  - `{theme}_overworld_v4.png`
- Ground tile PNGs should be `1024x1024`.
- The runtime builds a deterministic random mosaic from available variants.
- Variants must have matching brightness, base color, density, and orientation.
- The runtime does not rotate or flip generated ground variants.
- When replacing same-name ground files, bump `EXTERNAL_GROUND_ASSET_VERSION` in
  `components/game/PixelGround.tsx` so browsers do not keep using cached PNGs.
- Ground top surfaces render unlit, with `toneMapped: false`, so the PNG colors
  stay close to the authored image.

Props:

- Save prop sprites in `public/assets/images/props/`.
- Use transparent PNGs named by prop type, for example `tree.png`,
  `tree_stump.png`, `plastic_bag_shrub.png`, `bottle_pile.png`.
- Keep prop canvases full-resolution `512x512`.
- Do not downsample or code-pixelate props after generation. The cartoon
  pixel-art style should come from the generated artwork itself.
- Bottom-align each prop with the visible base close to the lower edge; Stage 1
  uses `6px` bottom padding.
- Props use pitch-only billboarding in `SpriteBillboard.tsx` so they keep the
  vertical camera view without leaning left/right during subtle side camera yaw.

## Ground Workflow

1. Use `$generate2dmap` to confirm the stage theme, visual direction, and whether
   the existing four-variant ground contract is still sufficient.
2. Generate or edit four grass tile variants with `$imagegen`.
3. Keep the current Stage 1 direction as the reference:
   - high-quality image-generated grass texture
   - sparse litter and flowers
   - a little readable trash in the ground art
   - not neon lime
   - not overly blocky or visibly tiled
   - not painterly/dense with micro-detail
4. Keep all variants in the same color family. If needed, normalize only green
   grass pixels so flowers and litter remain readable.
5. Check final stats. Variant luminance should be close enough that random tile
   placement does not create a checkerboard effect.
6. Save only `_overworld` files. Do not create separate battle copies.

Suggested ground prompt shape:

```text
Create four 1024x1024 variants of a seamless forest grass ground tile for ECO Guardian.
Style: bright but controlled cartoon pixel-art-inspired game ground, high-quality
raster, sparse readable detail, small flat plastic litter, tiny white flowers,
simple grass tufts, mostly open grass. Keep all variants the same base green,
brightness, density, and direction. Avoid neon lime, painterly micro-texture,
visible borders, large props, rocks, trees, characters, shadows, labels, or UI.
```

## Prop Workflow

1. Use `$generate2dmap` to decide whether the stage needs a prop pack, one-off
   hero props, or both. For small reusable environmental props, prefer a prop
   sheet.
2. Generate a prop sheet with `$imagegen`, usually `3x2` for six related props.
3. Use a flat `#FF00FF` chroma-key background for clean local extraction.
4. Prompt for full-resolution cartoon pixel-art sprites:
   - bold readable outlines
   - chunky simplified silhouettes
   - larger color blocks
   - flat cel-like pixel shading
   - less fantasy-RPG painted texture
5. For polluted forest stages, integrate readable trash into multiple props
   instead of isolating all litter in one pile. Use bottles, bags, cans,
   wrappers, cardboard, caps, and paper scraps where appropriate.
6. Locally remove the chroma-key background, remove tiny stray alpha components,
   crop each prop to its visible bounds, and place it on a transparent `512x512`
   canvas with the base near the bottom.
7. Do not resize down to a low-resolution canvas. If scale adjustment is needed,
   prefer regenerating or changing the in-game prop scale.

Suggested Stage 1 prop prompt shape:

```text
Generate one 3-column by 2-row prop sheet for ECO Guardian Stage 1.
Each cell contains one separate forest environmental prop with visible pollution.
Style: cartoon pixel-art / retro-modern pixel sprite, bold dark readable
outlines, chunky simplified shapes, flat cel-like pixel shading, limited palette,
playful game icon style, high-resolution artwork. Use a perfectly flat #FF00FF
background. Keep each prop fully contained, centered, and bottom-aligned.
No labels, no text, no watermark, no shadows on the background.
```

## Post-Processing Checks

For every prop PNG:

- Image size is `1024x1024`.
- Alpha channel exists.
- Transparent corners.
- Visible base is near the lower edge.
- No magenta fringe.
- No tiny detached artifacts.
- The prop reads clearly at gameplay scale.

For every ground PNG:

- Image size is `512x512`.
- No visible borders.
- No rotated directional lighting between variants.
- Variant brightness and color are tightly matched.
- Litter/detail density is similar across variants.

Useful validation snippets:

```powershell
@'
from pathlib import Path
from PIL import Image, ImageStat
for path in sorted(Path('public/assets/images/ground').glob('*_overworld*.png')):
    im = Image.open(path).convert('RGB')
    stat = ImageStat.Stat(im)
    lum = sum(m*w for m,w in zip(stat.mean, (0.2126, 0.7152, 0.0722)))
    print(f'{path.name}: size={im.size} mean_rgb={tuple(round(v,1) for v in stat.mean)} mean_lum={round(lum,1)}')
'@ | python -
```

```powershell
@'
from pathlib import Path
from PIL import Image
for path in sorted(Path('public/assets/images/props').glob('*.png')):
    im = Image.open(path).convert('RGBA')
    bbox = im.getchannel('A').getbbox()
    if bbox:
        x0,y0,x1,y1 = bbox
        print(f'{path.name}: size={im.size} bbox=({x1-x0}x{y1-y0}) bottomPad={im.height-y1}')
'@ | python -
```

Always finish with:

```powershell
npm run build
```

Browser visual checks are optional when the requester plans to test manually.
