# ECO Guardian - Major Refactor Plan

## Context

ECO Guardian is a Vampire Survivors-style educational game built with React + TypeScript + Vite + Three.js. It was originally made with Google AI Studio and hosted on Google Cloud App Engine with:
- **Gemini 3 Flash** for quiz generation, upgrade advice, death messages, and waste image analysis
- **Google Cloud Firestore** for global leaderboard
- **Camera feature** (ECO_BUILDING) where players scan real waste items for Gemini to analyze and award carbon credits

The goal of this refactor is to:
1. Remove all AI (Gemini) features → replace with static/code-based equivalents
2. Remove the camera/ECO_BUILDING feature entirely (it required AI)
3. Replace Google Firestore → Supabase PostgreSQL
4. Replace Google Cloud App Engine hosting → Vercel

---

## Phase 1: Remove ECO Scanner Building (Camera Feature)

> **Note:** There are two separate buildings in the game:
> - **ECO Scanner** (`VoxelEcoBuilding.tsx`) — camera/waste scanning → **DELETE**
> - **ECO Mart** (`VoxelShop.tsx`) — the shop — **KEEP** (the "Ask Gaia" AI button inside is replaced in Phase 2f, not removed)

**Files to DELETE:**
- `components/ui/EcoBuildingModal.tsx`
- `components/game/VoxelEcoBuilding.tsx`

**Files to MODIFY:**

### `types.ts`
- Remove `ECO_BUILDING` from `GameMode` enum
- Remove `'SCAN'` from `ImpactLogEntry.type` union (keep only `'QUIZ'`)
- Remove `itemName?: string` and `feedback?: string` from `ImpactLogEntry`
- Remove `lastEcoScanStage: number` from `PlayerStats` interface

### `store/gameStore.ts`
- Remove `enterEcoBuilding: () => void` from `GameState` interface
- Remove `awardScanReward` from `GameState` interface and implementation
- Remove `lastEcoScanStage` from `saveMetaStats`, `getInitialStats` defaults, and saved-state merge
- Remove `enterEcoBuilding` action implementation
- Remove `GameMode.ECO_BUILDING` from `togglePause` conditions

### `components/game/Scene.tsx`
- Remove `import { VoxelEcoBuilding }` import
- Remove `enterEcoBuilding` from `useGameStore()` destructure
- Remove `ECO_BUILDING_POS` constant
- Remove prop-spawn exclusion zone for eco building
- Remove eco building collision detection block
- Remove `<VoxelEcoBuilding>` render
- Remove `GameMode.ECO_BUILDING` from all mode comparison OR-conditions
- **Keep all VoxelShop and shop-related code untouched**

### `components/ui/UIOverlay.tsx`
- Remove `import { EcoBuildingModal }` import
- Remove ECO Scanner minimap variables and icon JSX
- Remove the `mode === GameMode.ECO_BUILDING` render check and `<EcoBuildingModal>` render
- **Keep ShopModal and all shop-related UI untouched**

### `metadata.json`
- Remove `"camera"` from `requestFramePermissions` array (set to `[]`)

---

## Phase 2: Replace Gemini AI with Static Code

All changes in `store/aiDirectorStore.ts` (refactor, do NOT delete — other files import from it).

### 2a. Remove Gemini dependencies
- Delete `import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai"` (line 3)
- Delete `RecyclingAnalysis` interface
- Delete `callGeminiWithRetry` function
- Delete `cleanJson` helper function
- Delete `analyzeWasteImage` method entirely + remove from `AiDirectorState` interface

### 2b. Add expanded static quiz pool
Replace/expand the current 15-question `FALLBACK_QUIZ_POOL` with a `STAGE_QUIZ_POOLS` map of 60+ questions organized by stage theme (6+ per stage) and difficulty tag. The 10 stage themes are: The Plastic Woods, E-Waste Graveyard, Frozen Server Farm, Magma Refinery, Silicon Dunes, Toxic Swamp, Cyber City Ruins, The Null Void, Cloud Data Center, Digital Hell.

Add a `selectQuizQuestion(stageName, difficulty, availableOptions?)` helper that:
1. Picks the right pool for the stage (falls back to global pool)
2. Filters by difficulty, falls back to full pool if no matches
3. Picks a random question
4. Assigns correct answer to a random option slot (A/B/C)
5. Returns `{question, options, correctOption, explanation, impactValue}` — same shape as before
   - impactValue by difficulty: EASY=75, MEDIUM=100, HARD=150

### 2c. Rewrite `generateNextStage`
- Keep stage selection logic and loop difficulty scaling (unchanged)
- Replace Gemini try/catch with: `finalConfig.quiz = selectQuizQuestion(finalConfig.stageName, difficulty)`
- Function can stay `async` for compatibility

### 2d. Rewrite `generateMidStageQuiz`
- Replace Gemini try/catch with: `quiz = selectQuizQuestion(stageName, difficulty, availableOptions)`
- Set quiz into state

### 2e. Rewrite `generateDeathMessage`
- Replace with static array of ~16 eco-themed messages
- Return `DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]`

### 2f. Rewrite `generateUpgradeAdvice` ("Ask Gaia" in ECO Mart)
The ECO Mart shop has an "Ask Gaia" button that calls `generateUpgradeAdvice()` for AI-powered upgrade recommendations. Replace the Gemini call with a deterministic priority algorithm — same button, same UI, instant response.

Deterministic priority algorithm:
1. **Evolution weapons** (highest) — option where `isEvolution === true`
2. **Evolution-pair completers** — new weapon that pairs with an already-owned weapon in `EVOLUTION_RECIPES`
3. **New weapons** — if weapon slots not full
4. **New passives**
5. **Stat upgrades**
6. **Anything remaining** (fallback)
- Returns `{recommendedOptionId, reason}` — same shape as before, so `ShopModal.tsx` needs no changes
- Keep `import { EVOLUTION_RECIPES }` from constants — still needed here

### 2g. Update `vite.config.ts`
- Remove the `define` block that polyfills `process.env.API_KEY` for the client

---

## Phase 3: Migrate Database Firestore → Supabase

### 3a. Create Supabase table (manual step in Supabase dashboard)
```sql
CREATE TABLE leaderboard (
  id SERIAL PRIMARY KEY,
  name VARCHAR(10) NOT NULL,
  stage INTEGER DEFAULT 1,
  kills INTEGER DEFAULT 0,
  damage INTEGER DEFAULT 0,
  carbon_saved INTEGER DEFAULT 0,
  date BIGINT NOT NULL
);
CREATE INDEX ON leaderboard (carbon_saved DESC);
INSERT INTO leaderboard (name, stage, kills, damage, carbon_saved, date)
VALUES 
  ('Gaia', 10, 999, 50000, 1000, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000),
  ('EcoBot', 5, 150, 12000, 400, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000);
```

### 3b. Rewrite `server.js`
- Remove: all `@google-cloud/firestore` imports, 3-tier credential loading, local JSON fallback, `fs` import
- Add: `import { createClient } from '@supabase/supabase-js'`
- Add Supabase client init from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars
- Add `mapRow(row)` helper: maps `carbon_saved` → `carbonSaved` (snake_case DB → camelCase API)
- Keep same 3 Express routes with same signatures — frontend needs no changes:
  - `GET /api/health` → returns `database: 'supabase' | 'offline'`
  - `GET /api/leaderboard` → Supabase query ordered by `carbon_saved DESC`, limit 50
  - `POST /api/leaderboard` → insert entry with `carbon_saved` field, return updated top 50
- Keep `DEFAULT_SCORES` array as in-memory fallback if Supabase unavailable

### 3c. Update `store/gameStore.ts`
- In `checkDbStatus`: change `data.database === 'firestore'` to `data.database === 'supabase'`

### 3d. Update `package.json`
- Remove: `"@google/genai"`, `"@google-cloud/firestore"`
- Add: `"@supabase/supabase-js": "^2.45.0"` (latest stable 2.x)
- Run `npm install` after

---

## Phase 4: Migrate Hosting Google Cloud → Vercel

### 4a. Delete `app.yaml`

### 4b. Create `api/index.js` (Vercel serverless function)
Copy the API route logic from `server.js` with two differences:
- Remove `app.use(express.static(...))` (Vercel serves `dist/` natively)
- Remove `app.get('*', ...)` catch-all and `app.listen()` call
- Add `export default app;` at end

### 4c. Create `vercel.json` at project root
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" }
  ],
  "functions": {
    "api/index.js": { "runtime": "@vercel/node" }
  }
}
```

### 4d. Configure Vercel environment variables (in Vercel dashboard)
**Add:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV=production`

**Remove (no longer needed):**
- `API_KEY` (Gemini)
- `GOOGLE_CREDENTIALS_BASE64`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## Critical Files Summary

| File | Change |
|------|--------|
| `store/aiDirectorStore.ts` | Major rewrite — remove Gemini, add static quiz pool + algorithms |
| `server.js` | Major rewrite — Firestore → Supabase |
| `components/ui/EcoBuildingModal.tsx` | **DELETE** (ECO Scanner UI) |
| `components/game/VoxelEcoBuilding.tsx` | **DELETE** (ECO Scanner building) |
| `components/ui/ShopModal.tsx` | **KEEP** — no changes needed (Ask Gaia button still works, just calls updated store function) |
| `components/game/VoxelShop.tsx` | **KEEP** — no changes |
| `components/game/Scene.tsx` | Remove ECO building references |
| `components/ui/UIOverlay.tsx` | Remove ECO_BUILDING mode render |
| `types.ts` | Remove ECO_BUILDING, SCAN types |
| `store/gameStore.ts` | Remove eco building actions + update dbStatus check |
| `vite.config.ts` | Remove API_KEY define |
| `metadata.json` | Remove camera permission |
| `package.json` | Swap AI/Firebase deps for Supabase |
| `app.yaml` | **DELETE** |
| `api/index.js` | **CREATE** — Vercel serverless handler |
| `vercel.json` | **CREATE** — Vercel config |

---

## Verification (End-to-End Testing)

1. `npm run build` — no TypeScript errors
2. Game loads → overworld renders, no camera/eco building icon on minimap
3. Walk to former ECO building position → nothing happens (no crash)
4. Quiz portal works → question appears from static pool, relevant to stage theme
5. Level up → upgrade advice shows instantly (no network call, no spinner)
6. Player dies → eco-themed death message appears
7. `GET /api/health` → returns `database: supabase`
8. `GET /api/leaderboard` → returns seeded Supabase data
9. Submit score → appears in leaderboard
10. Vercel deployment → all above works at production URL
11. Browser network tab → zero calls to `generativelanguage.googleapis.com`
