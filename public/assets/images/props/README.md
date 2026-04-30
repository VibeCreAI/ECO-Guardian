Drop optional 2D prop sprites here.

Use transparent PNG files named after the prop type in snake_case, for example:

- tree.png
- grave.png
- crystal.png
- magma_rock.png
- server.png
- neon_sign.png

The game renders a procedural pixel-art fallback first. If a matching PNG exists,
the runtime swaps that texture in while keeping the same prop placement and scale.

Stage props should be full-resolution transparent PNGs with a cartoon pixel-art
style generated into the artwork itself, not downsampled by post-processing.
Keep each prop on a square canvas with the visible base close to the lower edge
so billboards sit on the ground instead of appearing to float.
For polluted forest stages, integrate readable trash accents into multiple props
instead of isolating all litter in one pile: bottles, bags, cans, wrappers, and
cardboard should be bold enough to read at gameplay scale.
For later stages, prefer theme-specific prop aliases when a shared prop would
need different art. For example, Stage 2 uses `skull_stone.png` instead of
overwriting the shared `stone.png`; Stage 3 uses `ice_stone.png` for frozen
rock art. Extra small pollution piles can be added as theme-specific types such
as `frozen_cable_pile.png`, `scorched_ewaste_pile.png`, or
`silicon_ewaste_pile.png`. Stage 5 uses `pyramid_stone.png` instead of the
shared forest `stone.png`.
