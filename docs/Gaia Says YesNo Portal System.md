# Gaia Says: Yes/No Portal System

## Overview

Replace the current three-option trivia quiz portals with a two-portal Yes/No question system. Players face funny, surprising sustainability questions and walk through the YES or NO portal to answer. The mechanic is instant to understand, fun to play, and still teaches eco facts through counterintuitive "gotcha" moments.

---

## Stage Flow

Each stage follows a fixed three-round structure:

```
Round 1: Mob wave → clears → YES/NO portal pair + question appears
Round 2: Mob wave → clears → YES/NO portal pair + question appears
Round 3: BOSS encounter
```

- Portals spawn **close to the stage landmark structure** (short walk, no hiking across the map)
- Boss portal also spawns **close to the landmark** at the start of Round 3
- After answering, a 2-second result flash appears, then combat resumes — no full pause

---

## Portal Design

- Two portals: one labeled **YES**, one labeled **NO** (large, clear text on the portal face)
- Question text displayed in a slim semi-transparent banner above the portals (or in the existing QuizModal at reduced size)
- When player walks through one portal, the other implodes
- Result flash: correct → *"Correct! Gaia approves. +100 kg CO₂"* / wrong → *"Oops. The oceans felt that one."*

---

## Carbon Reward

| Result | Carbon Reward | Combat Effect |
|--------|--------------|---------------|
| Correct | +100 kg CO₂ | None (reward is the carbon) |
| Wrong | +0 kg CO₂ | None (no punishment — keeps it fun) |

No penalty for wrong answers. The carbon differential across a full run creates natural leaderboard competition between players who know their sustainability facts and those who don't.

---

## Question Design Principles

Questions should be:
- **Surprising or counterintuitive** — the "gotcha" is the fun
- **Short** — one sentence max, readable under mild combat pressure
- **Definitively YES or NO** — no ambiguous answers
- **Eco/sustainability themed** — reinforces the game's identity

### Example Questions

| Question | Answer |
|----------|--------|
| Is eating one beef burger worse for the climate than driving 10km? | YES |
| Do data centers use more electricity than the entire airline industry? | YES |
| Is glass always more eco-friendly than plastic? | NO |
| Can a single tree absorb a ton of CO₂ in its lifetime? | YES |
| Is nuclear energy considered low-carbon by the IPCC? | YES |
| Does recycling aluminium use 95% less energy than making it new? | YES |
| Is bamboo faster-growing than all tree species? | YES |
| Does beef production use more water than chicken per kg? | YES |
| Are electric cars always zero-emission? | NO |
| Is fast fashion the second-largest polluter in the world? | YES |
| Can solar panels generate power on cloudy days? | YES |
| Does leaving devices on standby use significant energy over a year? | YES |
| Is tap water generally more eco-friendly than bottled water? | YES |
| Do reusable bags need 100+ uses to offset their production? | YES |
| Is organic farming always better for the environment? | NO |

---

## Question Pool Architecture

Questions are organised into pools by theme. Each stage draws randomly from its themed pool first, falling back to the global pool. No question repeats within a single run (track used IDs in session state).

### Pool Structure

```ts
interface YesNoQuestion {
  id: string;
  question: string;
  answer: 'YES' | 'NO';
  explanation: string; // shown in result flash (1 sentence)
  stageName: string;   // stage key or 'ANY' for global pool
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'; // future use
}
```

### Pool Targets

| Pool | Count |
|------|-------|
| The Plastic Woods | 6+ |
| E-Waste Graveyard | 6+ |
| Frozen Server Farm | 6+ |
| Magma Refinery | 6+ |
| Silicon Dunes | 6+ |
| Toxic Swamp | 6+ |
| Cyber City Ruins | 6+ |
| The Null Void | 6+ |
| Cloud Data Center | 6+ |
| Digital Hell | 6+ |
| ANY (global fallback) | 15+ |
| **Total** | **75+** |

---

## Implementation Steps

### 1. Data — `store/aiDirectorStore.ts`
- Replace `STAGE_QUIZ_POOLS` with `YES_NO_POOL: YesNoQuestion[]`
- Add `selectYesNoQuestion(stageName: string, usedIds: string[]): YesNoQuestion` helper
  - Filters by stage, excludes already-used IDs, falls back to `ANY` pool, picks randomly
- Track `usedQuestionIds: string[]` in store state, reset on new game
- Rewrite `generateMidStageQuiz` to select from `YES_NO_POOL` and set state
- Stage config quiz field now holds a `YesNoQuestion` shape

### 2. Types — `types.ts`
- Replace or extend `QuizConfig` to hold `YesNoQuestion` shape
- Keep `ImpactLogEntry.type = 'QUIZ'` — no change needed
- Keep `carbonSaved` on `PlayerStats` — same flow

### 3. UI — `components/ui/UIOverlay.tsx`
- Revise quiz modal: show question text + two large buttons (YES = green, NO = red)
- Remove A/B/C option rendering
- On button click: check against `question.answer`, award 100 carbon if correct, show result flash
- Result flash copy: correct → *"Correct! Gaia approves."* / wrong → *"Oops. The oceans felt that one."*
- Show `question.explanation` in result flash either way (1 sentence learning moment)

### 4. Portals — `components/game/Scene.tsx`
- Change portal count from 3 (A/B/C) to 2 (YES/NO)
- Spawn portals **close to the landmark structure** — reduce spawn radius significantly
- Label portals YES / NO instead of A / B / C
- Boss portal spawns close to landmark at Round 3 start
- Existing collision detection stays; just triggers Yes/No flow instead of A/B/C quiz

### 5. Round Structure — `store/gameStore.ts` or `store/aiDirectorStore.ts`
- Enforce 2-mob-round + 1-boss structure per stage
- After Round 1 wave clears → trigger `generateMidStageQuiz` → spawn YES/NO portals
- After Round 2 wave clears → trigger `generateMidStageQuiz` again → spawn YES/NO portals
- After Round 2 portal answered → spawn boss portal

---

## What Does NOT Change

- Carbon kg scoring and leaderboard — same system, same values
- ECO Mart / Ask Gaia upgrade advisor — untouched
- Death messages — untouched
- Stage progression — untouched
- All other GameModes — untouched
- `server.js` / Supabase — untouched
