# Plan: Redesign All Enemies with High-Resolution Procedural Canvas 2D Art

## Context

The current enemies in ECO Guardian are drawn at **64x64 pixels using only `ctx.fillRect()`** — single-pixel placement that produces very crude, blocky sprites. The Canvas 2D API has dramatically more powerful drawing primitives (arcs, bezier curves, gradients, shadows, alpha layering) that are completely unused. Additionally, enemies are shared across stages (e.g., MUTATED_BAT appears in stages 1, 2, 4, 8), breaking thematic consistency.

**Goal:** Replace all 25 existing enemy types with **60 unique enemies** (6 per stage), drawn at **256x256 resolution** using the full Canvas 2D API (paths, gradients, shadows, curves). Each stage gets its own exclusive set of garbage-themed monsters that match the stage theme. No external assets.

---

## Rendering Approach Change

**Current:** `fillRect()` pixel-by-pixel at 64x64 with `NearestFilter` (blocky pixel art)

**New:** Full Canvas 2D API at 256x256 with `LinearFilter` (smooth, detailed art)

Key techniques to use:
- `arc()`, `ellipse()` for smooth circles and organic shapes
- `bezierCurveTo()`, `quadraticCurveTo()` for organic body outlines
- `createRadialGradient()`, `createLinearGradient()` for color depth
- `shadowBlur` + `shadowColor` for glow/atmosphere effects
- `globalAlpha` for transparency layering (smoke, ghosts, gas)
- `stroke()` with `lineWidth` for detail lines, cracks, circuits
- 2-frame animation with more dramatic pose changes (wing angles, jaw open/close, glow pulse)

---

## 60 Enemy Designs (6 per stage, no repeats)

Categories: **F** = Fast/Flying, **M** = Medium, **T** = Tank/Slow

### Stage 1: The Plastic Woods (Forest / Green)
| Name | Cat | Visual |
|------|-----|--------|
| BOTTLE_SPRITE | F | Crumpled plastic bottle with leaf-wing appendages, translucent blue-green gradient body |
| WRAPPER_MOTH | F | Candy wrapper moth with iridescent foil wings, radialGradient shimmer |
| STRAW_CRAWLER | M | Bundle of bent plastic straws forming a spider, skittering legs |
| SIXPACK_VINE | M | Six-pack ring tangled with vines, pulsing green-brown organic mass |
| STYROFOAM_TREANT | T | Styrofoam chunks fused into tree-trunk shape, moss gradients, bark texture |
| COMPOST_HULK | T | Rotting compost pile with embedded plastic, steaming green gas haze |

### Stage 2: E-Waste Graveyard (Skull / Grey)
| Name | Cat | Visual |
|------|-----|--------|
| CIRCUIT_WRAITH | F | Ghostly floating circuit board fragment, trailing green solder-smoke |
| WIRE_PHANTOM | F | Tangled copper wires forming a spectral shape, orange-green sparks |
| BATTERY_ZOMBIE | M | Leaking battery walking on corrosion legs, acid-green drip gradients |
| MONITOR_GHOUL | M | Old CRT monitor with cracked screen face, stumpy cable-legs |
| MOTHERBOARD_GOLEM | T | Massive motherboard slab with capacitor horns, grey-green PCB textures |
| PRINTER_REVENANT | T | Hulking broken printer with paper-jam tongue, ink-splattered body |

### Stage 3: Frozen Server Farm (Ice / Light Blue)
| Name | Cat | Visual |
|------|-----|--------|
| COOLANT_WISP | F | Floating leaked coolant droplet, icy blue radialGradient with frost sparkles |
| FAN_BLADE_DJINN | F | Spinning server fan as flying disk, motion-blur via semi-transparent arcs |
| FROZEN_PHONE | M | Smartphone encased in ice crystals, cracked glowing screen, icicle legs |
| FROST_CABLE | M | Frozen ethernet cable coiled into serpent, ice-crystal scales via bezier |
| SERVER_RACK_YETI | T | Full server rack covered in frost, blinking red LED eyes |
| CRYO_DUMP_BEAST | T | Frozen garbage heap with ice armor, embedded bottles visible through ice |

### Stage 4: Magma Refinery (Volcano / Dark Red)
| Name | Cat | Visual |
|------|-----|--------|
| EMBER_BAG | F | Burning plastic bag on heat thermals, glowing orange edges with fire gradient |
| ASH_FLIER | F | Swirling ash/cinder forming bird shape, grey-to-orange gradient |
| SLAG_DRUM | M | Half-melted oil drum, molten metal dripping, orange glow interior |
| SMELT_RAT | M | Rat-shape of molten scrap metal, glowing seams, red eyes |
| FURNACE_TITAN | T | Industrial furnace on legs, open door mouth showing magma interior |
| REFINERY_COLOSSUS | T | Chimney-stack body with pipe arms, belching dark smoke clouds |

### Stage 5: Silicon Dunes (Pyramid / Sand-Gold)
| Name | Cat | Visual |
|------|-----|--------|
| GLASS_SCARAB | F | Crushed glass beetle with prismatic rainbow reflections via gradient |
| SILICON_WASP | F | Microchip wafer with translucent silicon wings, gold wire legs |
| SAND_BATTERY | M | Battery erupting from sand, sand-colored corrosion, sparking terminals |
| DUST_FILTER | M | Clogged air filter tumbling, dusty brown-gold layers |
| PYRAMID_JUNK | T | Pyramid of compressed trash blocks, golden-sand hue, waste hieroglyphs |
| DUNE_COMPACTOR | T | Massive industrial compactor on treads, sand-blasted metal |

### Stage 6: Toxic Swamp (Mushroom / Dark Green)
| Name | Cat | Visual |
|------|-----|--------|
| SPORE_AEROSOL | F | Floating aerosol can releasing toxic spore cloud, green-purple mist |
| SWAMP_DIAPER | F | Swollen diaper mutated with fungal wings, yellow-green |
| ALGAE_BARREL | M | Oil barrel overgrown with toxic algae, oozing green slime |
| FUNGAL_TIRE | M | Old tire colonized by bioluminescent mushrooms, green glow spots |
| SLUDGE_TOAD | T | Massive toad of industrial sludge, bubbling surface, toxic drool |
| BOG_HEAP | T | Enormous swamp trash pile with mushroom growths and bubbling gas |

### Stage 7: Cyber City Ruins (Cyber / Dark Blue)
| Name | Cat | Visual |
|------|-----|--------|
| NEON_WRAPPER | F | Fast-food wrapper glowing with neon circuit lines, digital wind |
| DRONE_LITTER | F | Broken delivery drone carrying scattered trash, sparking rotors |
| VENDING_HUSK | M | Destroyed vending machine on cable-legs, flickering screen face |
| TRAFFIC_CONE_BOT | M | Traffic cone with cybernetic augments, scanning laser eye |
| DUMPSTER_MECH | T | Dumpster transformed into walking mech, neon-blue welds |
| BILLBOARD_TANK | T | Collapsed digital billboard on treads, cracked LED glitch patterns |

### Stage 8: The Null Void (Void / Purple-Black)
| Name | Cat | Visual |
|------|-----|--------|
| VOID_PARTICLE | F | Floating micro-plastic phasing in/out of reality, purple-black shimmer |
| NULL_EMISSION | F | CO2 emission as spectral void form, wavering translucent purple smoke |
| ENTROPY_CAN | M | Crushed can consumed by void energy, half-dissolved, purple edges |
| STATIC_WASTE | M | Garbage bag filled with void static, flickering visible/invisible |
| ABYSS_LANDFILL | T | Landfill chunk suspended in void, gravitational distortion ring |
| OBLIVION_SLUDGE | T | Waste blob merging with void, tendrils reaching out, deep purple-black |

### Stage 9: Cloud Data Center (Sky / Light Blue)
| Name | Cat | Visual |
|------|-----|--------|
| CLOUD_BAG | F | Plastic bag caught in stratosphere, puffed like a cloud, white-blue |
| CONTRAIL_SERPENT | F | Jet contrail shaped like snake, wispy CO2 particles, white-grey |
| SATELLITE_JUNK | M | Broken satellite with solar panel wings, orbital debris aesthetic |
| DATA_SMOG | M | Data-center heat exhaust given form, pixelated edges, warm grey-blue |
| STRATOSPHERE_HEAP | T | Floating garbage island on hot server exhaust, massive |
| OZONE_EATER | T | Huge blob consuming ozone, iridescent rainbow gradient shell |

### Stage 10: Digital Hell (Hell / Red-Black)
| Name | Cat | Visual |
|------|-----|--------|
| HELLFIRE_WRAPPER | F | Burning fast-food wrapper with demon wings, flame trail |
| DAMNED_DRONE | F | Drone dragged to hell, burning rotors, trailing chains and smoke |
| INFERNAL_BARREL | M | Oil barrel wreathed in hellfire, demonic face melted into side |
| BRIMSTONE_PHONE | M | Smartphone cracked open leaking hellfire, screen showing digital screams |
| WASTE_DEMON | T | Massive demon of compressed garbage, burning eyes |
| LANDFILL_ARCHFIEND | T | Towering pile of all waste types fused with hellfire |

---

## Files to Modify

### 1. NEW: `components/game/enemyDrawing.ts`
- Canvas 2D helper utilities (gradient creators, shape builders, glow effects)
- 10 stage drawing sections, each with 6 enemy drawing functions
- Main dispatcher: `drawEnemy(ctx, type, frame, cx, y)` that switches on type
- Estimated ~2000-2500 lines (the bulk of the work)

### 2. `types.ts` (lines 185-188)
- Replace the Enemy `type` union with all 60 new type names + `'BOSS'` + `'MISINFORMATION'`

### 3. `store/aiDirectorStore.ts` (lines 320-401)
- Replace each stage's `spawnPool` array with the 6 unique enemy names for that stage

### 4. `components/game/BattleManager.tsx` (lines 345-381)
- Update fallback spawn types (lines 345-348) to use stage-1 enemies
- Replace stat-category arrays:
  - **Fast** (speed 4.0, hp 0.6x): all 20 "F" category enemies
  - **Medium** (speed 3.0, hp 0.8x): all 20 "M" category enemies  
  - **Slow/Tank** (speed 1.2, hp 2.5x, dmg 1.5x): all 20 "T" category enemies
  - **Ranged** (attackRange 6): 1 fast + 1 medium per stage = 20 ranged enemies
- Note: the existing "mid-slow tank" category (OIL_BARREL etc at speed 1.5, hp 1.8x) is merged into the medium category for simplicity

### 5. `components/game/SpriteBillboard.tsx`
- Update `MOBS` array (line 45-51) with all 60 new type names
- Change canvas size: `128x64` -> `512x256` for mobs (lines 64-65)
- Change texture filter: `NearestFilter` -> `LinearFilter` (line 223)
- Replace mob drawing block (lines 86-177) with import call to `drawEnemy()` from enemyDrawing.ts
- Update ghost/transparent type checks (line 412): replace `GAS_CLOUD`, `SLUDGE_HORROR`, `CO2_CLOUD` with new ghostly types (`VOID_PARTICLE`, `NULL_EMISSION`, `COOLANT_WISP`, `SPORE_AEROSOL`, `CIRCUIT_WRAITH`, `WIRE_PHANTOM`, `CLOUD_BAG`, `CONTRAIL_SERPENT`)

---

## Implementation Order

1. **`components/game/enemyDrawing.ts`** - Create new file with all 60 enemy drawing functions
2. **`types.ts`** - Update Enemy type union
3. **`store/aiDirectorStore.ts`** - Update all 10 stage spawn pools
4. **`components/game/BattleManager.tsx`** - Update stat categories and fallbacks
5. **`components/game/SpriteBillboard.tsx`** - Wire up new drawing system, update resolution/filter

---

## Verification

1. Run `npm run dev` / `npm run build` to verify no TypeScript errors
2. Load each of the 10 stages and confirm:
   - All 6 enemies render correctly with smooth, detailed art
   - 2-frame animation works (wing flaps, jaw movement, glow pulses)
   - No enemy appears in more than one stage
   - Fast enemies move fast, tanks are slow with high HP
   - Ranged enemies attack from distance
3. Verify boss sprites still render correctly (boss drawing code is unchanged)
4. Check MISINFORMATION enemy still works (kept as special quiz-penalty enemy)
5. Verify texture memory is reasonable (~30MB for 60 cached 512x256 textures)
