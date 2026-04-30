Drop optional 2D ground tile textures here.

Overworld and battle use the same generated tile set. Name files with the
`_overworld` suffix only:

- forest_overworld.png
- cyber_overworld.png
- hell_overworld.png

Optional variant files can be added with `_v2`, `_v3`, and `_v4` suffixes:

- forest_overworld_v2.png
- forest_overworld_v3.png
- forest_overworld_v4.png

Ground tile PNGs should be `1024x1024` so they stay sharp next to full-resolution
prop sprites. Keep the same visual density when increasing resolution; do not
make the grass busier just because the texture is larger.
When replacing same-name ground PNGs, bump `EXTERNAL_GROUND_ASSET_VERSION` in
`components/game/PixelGround.tsx` to avoid stale browser-cached textures.

The game renders a procedural pixel tile first. If a matching PNG exists, the
runtime swaps it into the ground material. If variants are present, the runtime
builds a deterministic random mosaic from the available tiles. Variants should
share the same base terrain color, brightness, density, material scale, line
weight, and orientation; the runtime places them without rotating or flipping
them. Generate the first tile as the style anchor, then use that first tile as
the reference for `_v2`, `_v3`, and `_v4`.

For Stage 1 forest ground, keep the current image-generated grass direction:
sparse readable details, consistent brightness across variants, controlled
forest greens, and no neon lime. Avoid pushing the ground into overly blocky
patches or dense painterly micro-texture.

For Stage 2 skull/e-waste ground, use gray paving stones rather than dark green
grass. Keep electronic trash as small ground accents around the paving:
batteries, wire scraps, circuit-board fragments, plugs, caps, and broken phone
glass.

For Stage 3 ice/frozen server farm ground, use pale blue ice floor slabs rather
than snow-only ground. Keep cyan seams, frosty cracks, snow speckles, and small
frozen e-waste accents: batteries, cable scraps, circuit chips, fan fragments,
cracked phone glass, and blue caps.

The top ground surface renders the image with an unlit material so scene lights
and shadows do not darken the authored texture. Side and bottom faces remain lit to
keep the slab depth readable.
