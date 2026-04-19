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
