# ECO Guardian — Auto-Matchmade Co-op (Supabase Realtime + Postgres)

## Context

ECO Guardian is currently a 100% single-player React Three Fiber game with Zustand state and a REST-only Supabase/Vercel backend (leaderboard). The user wants to turn it into **seamless drop-in co-op PvE** with no lobbies, no room codes, and no explicit "host a game" button. The rules:

- A player clicking **Play** is automatically placed into a group.
- If they are alone in that group, the game is a normal single-player run.
- As other players click Play, they automatically fill the group up to **4 players max**.
- A 5th player who can't fit forms a new group and starts solo until a 6th, 7th, etc. joins them.
- **Stage gating**: groups are matched by current stage. A player at stage 2 is never grouped with a player starting fresh at stage 1. Groups progress through stages together — once a group advances past stage 1, it is closed to new stage-1 joiners.
- **Leavers don't break the run**: if any player disconnects, the remaining players keep playing uninterrupted. The host role migrates automatically if the leaver was the host; the enemy simulation continues without a visible pause.
- **Player colors**: four distinct player asset variants (one per slot) visually distinguish group members. Slot index is assigned deterministically from join order.
- **Portal entry requires quorum**: in a co-op group, entering a battle requires a majority of living players to be standing on the same portal. A split vote blocks entry until players converge. Solo groups are unaffected (1/1 is always a majority).
- **Leaderboard stays per-player**: each player still submits their own individual end-of-run score (CO2 kg earned, stage reached, kills, damage) to the existing leaderboard — multiplayer doesn't pool stats.

Goal: the player never interacts with "multiplayer" as a mode. It just happens when other people are playing at the same stage.

Transport chosen during planning: **Supabase Realtime** (no dedicated game server). We additionally use a small Postgres schema as the matchmaking source of truth, with atomic RPCs to avoid race conditions when multiple players join simultaneously.

---

## Design decisions

### 1. Matchmaking model — "bucket by current stage, fill to 4"
- A **group** is a row in a new `mp_groups` table with a `current_stage` and `member_count`.
- When a player clicks Play, the client calls an RPC `find_or_create_group(player_id, name, stage)` that **atomically** finds a group with `current_stage = stage AND member_count < 4` and inserts the player into it — or creates a new group if none exists.
- The RPC is wrapped in a transaction with `FOR UPDATE SKIP LOCKED` so concurrent joiners cannot over-fill a group past 4.
- Once assigned, the client subscribes to the group's Realtime channel `eco-group:{uuid}`.
- **Stage advancement**: when the host's run advances `activeStage` from N → N+1, the host calls `advance_group_stage(group_id, new_stage)`. The group's `current_stage` is updated in Postgres; `mp_groups` only matches fresh joiners at the group's current stage, so a stage-3 group is automatically invisible to a fresh stage-1 player.
- **Fairness rule**: matchmaking only considers groups at `current_stage == player.stage` AND `current_stage == original_starting_stage` of the group OR the group hasn't started combat yet. MVP simplification: just `current_stage == player.stage`, and the UX implication is that a player who just started a fresh run at stage 1 will only match with other stage-1 groups — never with mid-progression groups.

### 2. Authority model — "soft host" (first joiner)
- The member with the earliest `joined_at` in a group is the **host**.
- Host drives: enemy spawning, wave progression, AI Director seed, portal generation, quiz selection, stage advancement calls.
- Every client is authoritative for its own player (position, facing, HP, attacks fired).
- **Host migration**: on host disconnect, the remaining member with the next-earliest `joined_at` promotes itself. Every client has the member list (read on join + updated via presence), so promotion is a pure local decision with no race.
- Not cheat-proof; acceptable for PvE co-op.

### 3. Transition solo ↔ co-op is seamless
- The game loop is unchanged whether you are alone or not. A solo run is just "a co-op run where the group has 1 member."
- When peers arrive: remote player sprites fade in, host starts broadcasting enemy state, nothing else changes.
- When peers leave: the game continues. If you are the last one, you simply keep playing; your group row lingers until you also leave, acting as a matchmaking target for a fresh joiner.
- No mode switch, no loading screen, no user-visible "joined!" prompt (except a subtle HUD notification).

### 4. Graceful leaver handling (progress continues)
- On peer disconnect (detected via Realtime presence `leave` event or a stale heartbeat >30s), all remaining clients:
  1. Remove the peer from `multiplayer.peers`.
  2. Recompute whose `joined_at` is earliest → if the leaver was the host, the next-earliest member promotes itself to host and immediately starts broadcasting enemy snapshots. Because each client already has the full member list from presence, this is a deterministic local decision — no handshake needed.
  3. Recompute portal-quorum tallies with the new living-player count (a vote that was deadlocked may now pass, or a vote that was passing may no longer qualify — both are fine).
  4. Never pause, never show a modal. A small HUD toast ("Player X left") is the only visible signal.
- If the leaver was *in* an active battle, their remote sprite is simply removed. Any enemies still targeting them re-target the nearest surviving player on the host's next tick.
- If the leaver was the **last remaining peer** and you are now alone, the game seamlessly reverts to solo behavior — no broadcasts, no network overhead — and your run continues.
- The Postgres `mp_members` row is cleaned by the leaver's `leave_group` RPC (called on `pagehide`) or by `prune_stale_members` if they crashed.

### 5. Player color slots (programmatically generated, no new art)
- The existing 4 player sprite images (walk/facing frames) stay exactly as they are. Three additional **visual variants** are generated at runtime from those same images using canvas 2d filters — zero new art assets.
- Slot 0 = original sprites (untouched, so the single-player experience is pixel-identical to today).
- Slot 1 = **sepia** (warm, brown-tinted). `ctx.filter = 'sepia(1) saturate(1.2)'`
- Slot 2 = **grayscale** (cold, monochrome). `ctx.filter = 'grayscale(1) brightness(0.95)'`
- Slot 3 = **hue-rotated** (e.g., cyan/blue shift). `ctx.filter = 'hue-rotate(180deg) saturate(1.1)'`
- These filters are chosen so all four slots are visually distinct at pixel scale even with the game's small sprite footprint. Exact filter values are tunable during implementation — the API stays the same.
- **Generation**: a new utility [components/game/playerTint.ts](components/game/playerTint.ts) that, for each base player texture, draws it to an offscreen `HTMLCanvasElement` with the filter applied, then wraps the canvas in a `THREE.CanvasTexture` with `minFilter = magFilter = NearestFilter` to preserve the pixel-art look. Cached on first use so the work happens once per session.
- Slot assignment: within a group, members are sorted by `joined_at` ascending; each member's index (0..3) is their **slot**. Slot 0 is the host. Recomputed locally on every presence change so everyone renders consistently.
- The **local** player renders using their own slot color. Remote players render in their slot colors via `RemotePlayer.tsx`. Alone, the local player renders as slot 0 — visually identical to today.
- [components/game/SpriteBillboard.tsx](components/game/SpriteBillboard.tsx) takes an optional `slotIndex` prop. It reads from a `PLAYER_SLOT_TEXTURES: Record<slot, Record<frameKey, CanvasTexture>>` map built on first render by calling into `playerTint.ts`. For slot 0, it uses the original base textures unchanged (no canvas round-trip).
- [assets.ts](assets.ts) is **not** modified — we reuse the existing player asset paths as the source for all four slot variants.

### 6. Quorum-gated portal entry (co-op only)
Today, [Scene.tsx:321](components/game/Scene.tsx#L321) enters a battle the moment any player's position comes within 1.5 units of a portal. In co-op this becomes a vote:

- **Rule**: let `N` = number of living, connected group members. A portal activates when `votes[portalId] > N / 2` (strictly greater than half).
  - 1 player: 1 vote needed (unchanged, solo-like).
  - 2 players: both (>1 required).
  - 3 players: 2.
  - 4 players: 3.
  - An exact split (e.g., 2-on-A, 2-on-B in a 4-player group) never passes — players must converge.
- **Tallying**: each client publishes its own "currently standing on portal X or none" as part of its self-broadcast (piggyback field on `player_state`). The host aggregates votes every tick and broadcasts a `portal_vote_state` message containing `{ portalId, voters[], requiredVotes, livingCount }`. All clients render the HUD from this.
- **Hold-and-confirm**: once a portal reaches quorum, the host starts a 2-second countdown. If a voter steps off during the countdown and quorum drops, the countdown cancels. If the countdown completes, the host broadcasts `battle_start(portalId)` and all clients transition into the battle scene together. This prevents flicker from players just walking past a portal.
- **UI**: a floating badge above each portal shows `votes / required` in co-op (e.g., "2 / 3") with the voters' slot colors as small dots. A short guide message near the HUD reads things like:
  - "Stand on the same portal to enter — 2 of 3 needed"
  - "Split vote — move to one portal to start"
  - "Starting in 3… 2… 1…" during the countdown
- **Solo (1-player groups)**: quorum = 1, no UI badge needed, behavior is identical to today's instant-entry.
- **Implementation**:
  - [Scene.tsx:321](components/game/Scene.tsx#L321) portal-detection block: replace the direct `enterBattle(portal)` call with "set my `currentPortalVote` ref and broadcast it" — only the host actually calls `enterBattle`, and only after the countdown completes. In solo, the host is the same client, so the behavior is unchanged.
  - New message types in [multiplayer/sync.ts](multiplayer/sync.ts): `portal_vote` (self-broadcast, field on player_state) and `portal_vote_state` (host aggregate).
  - [components/ui/UIOverlay.tsx](components/ui/UIOverlay.tsx): render the floating portal badges and the guide message when `multiplayer.peers` is non-empty.

### 7. Per-player leaderboard submission
- The existing leaderboard flow ([server.js](server.js) + leaderboard submission in gameStore) is **unchanged**. Each player still submits their own `{ name, stage, kills, damage, carbonSaved }` row at end-of-run, independently of their group.
- Because HP, XP, kills, damage, and CO2 are per-player state (see "what is shared" table below), each player accumulates their own numbers organically during the co-op run.
- A player who dies and gets revived still keeps their own stats; a player who leaves mid-run can submit their score at the point they left if the game treats disconnect as "run ended" (recommended — call the existing submit flow on `leaveMatchmaking`).
- Optional polish (out of scope for MVP): add a `co_op_size` column to the leaderboard to tag whether a run was solo or group; helps display "Co-op Top 10" separately. Not required for the user's stated ask.

### 8. Tick / sync rates
| Event | Rate | Authority |
|---|---|---|
| Self position/facing/hp | ~15 Hz | self (piggyback on the existing `updatePosition` throttle at [Scene.tsx:319](components/game/Scene.tsx#L319), which runs every 100ms — bump to ~66ms and broadcast on the same tick) |
| Attack fired | event | self (broadcast origin, direction, weapon id) |
| Enemy spawn | event | host |
| Enemy snapshot (pos/hp) | ~10 Hz | host (delta for living enemies) |
| Enemy death | event | host |
| Pickup (XP / CO2 orb) | event | claimant broadcasts, host confirms |
| Quiz show / first-correct | event | host |
| Stage advancement | event | host (also RPC) |
| Member heartbeat | 0.1 Hz (every 10s) | self (Postgres UPDATE to `mp_members.last_seen`) |

Remote sprites are interpolated between the last two received snapshots (120ms buffer).

### 9. What becomes shared vs. per-player
| State | Shared? |
|---|---|
| Overworld position of each player | Per-player, visible to all |
| Enemies, waves, portals | Shared (host-driven) |
| HP, XP, level, weapons, passives, CO2, lifetimeCarbon | Per-player |
| `activeStage` | Group-shared (all progress together) |
| Quiz: shown to all, first-correct claims reward | Shared trigger, per-player answer |
| Shop / Library / Status screens | Local-only (others keep playing) |

---

## New Supabase schema

Create a migration at `supabase/migrations/{timestamp}_create_mp_matchmaking.sql`:

```sql
-- Groups
create table public.mp_groups (
  id            uuid primary key default gen_random_uuid(),
  current_stage int not null,
  member_count  int not null default 0,
  created_at    timestamptz not null default now(),
  last_activity timestamptz not null default now()
);
create index on public.mp_groups(current_stage, member_count) where member_count < 4;

-- Members
create table public.mp_members (
  group_id   uuid not null references public.mp_groups(id) on delete cascade,
  player_id  uuid not null,
  name       text not null,
  joined_at  timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (group_id, player_id)
);
create index on public.mp_members(player_id);

-- Atomic find-or-create
create or replace function public.find_or_create_group(
  p_player_id uuid, p_name text, p_stage int
) returns uuid language plpgsql as $$
declare v_group uuid;
begin
  -- Try to grab an open group at this stage with a row lock.
  select id into v_group
  from public.mp_groups
  where current_stage = p_stage and member_count < 4
  order by created_at asc
  for update skip locked
  limit 1;

  if v_group is null then
    insert into public.mp_groups(current_stage, member_count)
    values (p_stage, 1) returning id into v_group;
  else
    update public.mp_groups
      set member_count = member_count + 1,
          last_activity = now()
      where id = v_group;
  end if;

  insert into public.mp_members(group_id, player_id, name)
    values (v_group, p_player_id, p_name)
    on conflict (group_id, player_id) do update set last_seen = now();

  return v_group;
end $$;

-- Leave (decrement + cascade cleanup)
create or replace function public.leave_group(p_player_id uuid) returns void
language plpgsql as $$
declare v_group uuid;
begin
  delete from public.mp_members where player_id = p_player_id returning group_id into v_group;
  if v_group is not null then
    update public.mp_groups
      set member_count = greatest(member_count - 1, 0), last_activity = now()
      where id = v_group;
    delete from public.mp_groups where id = v_group and member_count <= 0;
  end if;
end $$;

-- Stage advance
create or replace function public.advance_group_stage(p_group_id uuid, p_new_stage int) returns void
language plpgsql as $$
begin
  update public.mp_groups
    set current_stage = p_new_stage, last_activity = now()
    where id = p_group_id;
end $$;

-- TTL cleanup: any member idle >60s is dropped. Can be called from client heartbeat path.
create or replace function public.prune_stale_members() returns void
language plpgsql as $$
begin
  delete from public.mp_members where last_seen < now() - interval '60 seconds';
  update public.mp_groups g
    set member_count = (select count(*) from public.mp_members m where m.group_id = g.id);
  delete from public.mp_groups where member_count <= 0 and last_activity < now() - interval '60 seconds';
end $$;

-- RLS: public insert/select/delete via the RPCs only (revoke direct table writes)
alter table public.mp_groups  enable row level security;
alter table public.mp_members enable row level security;
grant execute on function public.find_or_create_group(uuid, text, int) to anon, authenticated;
grant execute on function public.leave_group(uuid) to anon, authenticated;
grant execute on function public.advance_group_stage(uuid, int) to anon, authenticated;
grant execute on function public.prune_stale_members() to anon, authenticated;
```

---

## New files

```
multiplayer/
  matchmaker.ts          Calls the RPCs (find_or_create_group, leave_group, advance_group_stage, prune_stale_members)
  roomClient.ts          Supabase Realtime channel wrapper for a single group (broadcast + presence)
  sync.ts                Message type definitions (discriminated union), encode/decode, throttle helpers
  hostAuthority.ts       Host-only logic: enemy spawns/snapshots/deaths, stage advancement, portal vote aggregation + countdown
  portalVote.ts          Quorum rule, per-portal tally, countdown state machine
  heartbeat.ts           10-second interval that updates mp_members.last_seen and calls prune_stale_members
  useMultiplayer.ts      React hook bridging matchmaker + roomClient ↔ gameStore
components/game/
  RemotePlayer.tsx       Remote player sprite with interpolation + name tag + HP bar + slot color
components/ui/
  PortalVoteBadge.tsx    Floating per-portal badge showing votes / required + voter slot colors
  CoopGuideMessage.tsx   HUD guide text ("Stand on the same portal — 2 of 3 needed", "Split vote…", countdown)
```

## Modified files

### [store/gameStore.ts](store/gameStore.ts)
Add a `multiplayer` slice:
```ts
multiplayer: {
  localPlayerId: string;  // uuid, generated once per browser (persisted in localStorage)
  groupId: string | null;
  isHost: boolean;
  slotIndex: number;      // 0..3, derived from sorted joined_at within the group
  peers: Record<string, PeerState>;  // id → { name, position, facing, hp, weapon, joinedAt, lastSeen, slotIndex }
  portalVotes: Record<string, { voters: string[]; required: number; countdownMs: number | null }>;
  guideMessage: string | null;       // "Stand on the same portal — 2 of 3 needed" etc.
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
}
```
New actions: `joinMatchmaking(stage)`, `leaveMatchmaking()`, `applyPeerSnapshot(id, state)`, `removePeer(id)`, `promoteToHost()`, `onGroupStageAdvance(newStage)`, `setLocalPortalVote(portalId | null)`, `applyPortalVoteState(...)`, `setGuideMessage(msg)`.

No new GameMode. Solo vs co-op is just whether `peers` has ≥1 entry.

### [App.tsx](App.tsx)
- On game start (when the player clicks Play from the menu — currently dispatched via gameStore's existing start action), call `joinMatchmaking(1)` before transitioning to overworld.
- On tab close / `pagehide`, call `leaveMatchmaking()` via `navigator.sendBeacon` or a fire-and-forget `leave_group` RPC.
- Keep input refs at [App.tsx:13](App.tsx#L13) as-is — multiplayer doesn't change input handling.

### [components/game/Scene.tsx](components/game/Scene.tsx)
- In `useFrame` at [Scene.tsx:268](components/game/Scene.tsx#L268): after the existing `updatePosition` call at [Scene.tsx:319](components/game/Scene.tsx#L319), broadcast a `player_state` message at ~15Hz if any peers exist. The message includes the player's current `portalVote` (portalId the player is standing on, or null). If alone, skip broadcasts entirely to save bandwidth.
- **Replace the direct `enterBattle(portal)` call at [Scene.tsx:321](components/game/Scene.tsx#L321)**:
  - Solo (no peers): behave exactly as today — call `enterBattle(portal)` immediately on proximity.
  - Co-op: instead, detect the nearest portal within 1.5 units and set it as the local `portalVote`. Do NOT call `enterBattle` here. The host's `portal_vote_state` broadcast will eventually issue a `battle_start` event which triggers `enterBattle` for everyone.
- Render `<RemotePlayer />` for each entry in `multiplayer.peers`, passing `slotIndex` so each uses the correct color variant.
- Render the local player using [SpriteBillboard.tsx](components/game/SpriteBillboard.tsx) with the local `slotIndex` (0 when solo).
- VibeJam portal logic at [Scene.tsx:327-351](components/game/Scene.tsx#L327-L351) remains strictly local (only the player who walks into it redirects).

### [components/game/SpriteBillboard.tsx](components/game/SpriteBillboard.tsx)
- Accept an optional `slotIndex: 0 | 1 | 2 | 3` prop.
- For slot 0, use the base player textures exactly as today (no tinting).
- For slots 1–3, look up the tinted variant from `PLAYER_SLOT_TEXTURES` (built once on first access by `playerTint.ts`).
- Default to slot 0 when unset, preserving single-player rendering.

### New: [components/game/playerTint.ts](components/game/playerTint.ts)
- Exports `getPlayerSlotTextures(slotIndex)` and `PLAYER_SLOT_FILTERS` constant.
- Lazy-loads base player images (from the existing asset paths), draws each to an offscreen canvas with the slot's CSS filter, produces a `THREE.CanvasTexture` configured for pixel-art (NearestFilter, no mipmaps), and caches the result.
- Idempotent — calling it multiple times returns the same texture references.
- Handles the case where the base image isn't loaded yet by awaiting an `image.decode()` / `img.onload` promise before drawing.

### [components/game/BattleManager.tsx](components/game/BattleManager.tsx)
- Wrap enemy spawning, AI movement, enemy projectile physics, wave progression in `if (isHost || isSolo)`.
- Non-host clients: apply `enemy_spawn` / `enemy_snapshot` / `enemy_death` messages received via `useMultiplayer` into the same `enemies[]` ref the renderer reads — rendering code unchanged.
- Player projectiles: remain client-authoritative for visuals. Broadcast an `attack` event so other clients render them. Damage calculation stays local; a `hit_report` is sent to host, who reconciles into the enemy snapshot stream.
- Pickups: each client detects collision locally; first-to-touch broadcasts `pickup_claim`; host confirms or denies.
- **On peer leave during battle**: enemy AI targeting code must re-target the nearest surviving player on the host's next tick. Handled by reading from `multiplayer.peers` (plus self) rather than a fixed player ref.
- **Leaderboard submission on leave**: when the local player leaves the group (tab close, explicit leave, or disconnect fallback), call the existing leaderboard submit flow with their current stats. Their score enters the leaderboard at the stage they left, even if teammates continue.

### [store/aiDirectorStore.ts](store/aiDirectorStore.ts)
- Host generates stages as today, broadcasts `{ stageId, seed, enemyPool, portals[] }` on generation.
- Non-hosts skip local generation; apply received stage definition.
- Whenever `activeStage` changes on host, call `advance_group_stage(groupId, newStage)`.

### [components/ui/UIOverlay.tsx](components/ui/UIOverlay.tsx)
- Add an unobtrusive HUD element showing group member avatars + HP bars, color-coded by slot (shows nothing when alone).
- Render `<PortalVoteBadge />` over each portal when in co-op, showing `votes / required` and the voter slot colors. Hidden when solo.
- Render `<CoopGuideMessage />` centered near the top of the HUD when there is an actionable vote state (split, waiting, or countdown).
- Add subtle toasts: "Player X joined" / "Player X left" / "You are now the host."
- No menu changes — there is no "Play Co-op" button; matchmaking is invisible.

### [constants.ts](constants.ts) or new [multiplayer/config.ts](multiplayer/config.ts)
- `MAX_GROUP_SIZE = 4`
- `POSITION_BROADCAST_HZ = 15`
- `ENEMY_BROADCAST_HZ = 10`
- `INTERP_BUFFER_MS = 120`
- `HEARTBEAT_INTERVAL_MS = 10000`
- `STALE_TIMEOUT_MS = 30000`  (client-side; prune RPC uses 60s as DB-side fallback)

### `.env.local` / Vercel env
- Reuse existing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

---

## Reused existing infrastructure
- **Supabase client**: already used by the leaderboard in [server.js](server.js) / [api/index.js](api/index.js). Instantiate `@supabase/supabase-js` on the client once and reuse for both matchmaking RPCs and Realtime channels.
- **Position throttling**: [Scene.tsx:319](components/game/Scene.tsx#L319) already throttles to 10Hz — piggyback the broadcast on that tick.
- **Input refs pattern**: [App.tsx:13](App.tsx#L13) — stays local; only derived state (position, actions) is broadcast. Peer positions should likewise be stored in a ref map and read in `useFrame`, not in Zustand reactive state, to avoid per-frame re-renders.
- **GameMode enum**: unchanged. No new modes.
- **Zustand store slice pattern**: additive, no refactor.

---

## Implementation phases (verify after each)

1. **Schema + RPC smoke test** — apply migration locally; call `find_or_create_group` from the Supabase SQL editor with three different player IDs at stage 1, confirm they land in the same group; try a 4th → same group; 5th → new group. Try a player at stage 2 → new stage-2 group even when stage-1 group has room.
2. **Matchmaker + heartbeat** — hook into game start, verify that clicking Play creates/joins a row in `mp_members`; verify heartbeat keeps `last_seen` fresh; verify `leave_group` fires on tab close.
3. **Solo passthrough** — with a single player, confirm the game behaves *identically* to today (no frame drops, no extra network traffic beyond presence + heartbeat, no visual artifacts, instant portal entry still works).
4. **Overworld position sync + color slots** — two browser windows, both click Play, they land in the same group, each sees the other's sprite glide smoothly in the overworld and rendered in a different color variant (slot 0 vs slot 1).
5. **Portal quorum — 2 players** — both players walk toward different portals; neither enters. Both walk onto the same portal; a "2/2" badge appears; a 2-second countdown runs; both transition into the battle together. If one steps off during countdown, it cancels.
6. **Host-driven battles** — both enter a portal via quorum, see the same enemies at roughly the same positions; kills counted correctly.
7. **Shared combat + pickups + quiz + level-up** — projectiles from both players deal damage; XP orbs go to the collector; quiz pops for both, first-correct claims the CO2.
8. **Stage advancement** — host clears stage 1, advances to stage 2; `mp_groups.current_stage` updates; a third browser window opening at stage 1 does NOT join this group (forms its own).
9. **Portal quorum — 4 players + split** — fill a group to 4; split them 2-on-A / 2-on-B; confirm no battle starts and the guide reads "Split vote". Move one to the other side (now 3/1) — battle starts.
10. **5th player forms new group** — open 5 windows, confirm windows 1-4 are in group A, window 5 is in group B alone; open a 6th → joins group B.
11. **Mid-run leave — progress continues** — in a 3-player group, close one non-host window mid-battle. Remaining 2 keep playing uninterrupted; enemies re-target; portal quorum now needs only 2 (recalculated).
12. **Host leave — progress continues** — close the host window; the remaining earliest-joined member promotes to host within ~2s; enemy sim continues from their side without pausing.
13. **Per-player leaderboard on leave** — a player who leaves mid-run submits their own stage + CO2 + kills + damage to the leaderboard; the teammates' ongoing run is unaffected.
14. **Leave cleanup** — verify `mp_members` and `mp_groups` rows are pruned after all disconnects.

---

## Verification (end-to-end)

1. `npm run dev`.
2. Apply the migration (`supabase db push` or via the dashboard).
3. Open four Chromium windows at the dev URL. Click Play in each.
4. Confirm all four are in the same group (Supabase dashboard → `mp_members`) and each window renders the local player in a distinct slot color (slots 0–3).
5. Walk around in each — every window should see the other three as sprites with the correct color variants.
6. All four walk onto **different** portals → confirm no battle starts and each portal's badge reads "1 / 3".
7. Three players walk onto the same portal → badge reads "3 / 3", a 2-second countdown fires, all four (including the outlier) transition into the battle together.
8. During battle, kill enemies on both sides; verify kill / XP / CO2 increments stay per-player on the HUD.
9. Quiz triggers → both windows see it → the first-correct answerer gets the reward.
10. Open a 5th window → click Play → should land in a new empty group at stage 1 (confirm in `mp_members`).
11. In window 1, clear stage 1 and advance to stage 2; confirm `mp_groups.current_stage = 2` for that group.
12. Open a 6th window at stage 1 → should land in the 5th player's group, not windows 1–4's group.
13. Close a non-host window mid-run → remaining players keep playing uninterrupted; confirm that player's score appears in the leaderboard with their stage-at-leave.
14. Close the host window (window 1) → confirm window 2 becomes host within ~2s; enemy sim continues without pausing.
15. Close all remaining windows → confirm `mp_members` drains and `mp_groups` rows are deleted.
16. Solo regression: fresh private browser → start a run → play a battle → portal entry is instant (no countdown, no badges, no guide text) → submit score → leaderboard flow still works.
17. Check the browser devtools network tab for Realtime WebSocket frames + RPC calls; confirm no runaway traffic.

---

## Out of scope
- PvP or adversarial game modes.
- Cheat prevention / server-authoritative validation (no real game server in this plan).
- Public group browser, friend invites, reserved slots.
- Re-balancing enemies/XP for co-op (initial version uses existing difficulty numbers).
- Shared persistent progression.
- Voice chat / text chat.
- Rejoining a specific group after disconnect (a returning player just matchmakes again).
- Tagging leaderboard entries with co-op vs solo (possible future polish; not required).

## Risks and mitigations
- **Race conditions on join**: handled by `FOR UPDATE SKIP LOCKED` in the RPC.
- **Ghost members after crashes**: `prune_stale_members` RPC + client heartbeat. Call prune opportunistically on every matchmake.
- **Supabase Realtime free-tier limits** (~100 concurrent, 2M msgs/month): for 4-player groups, ~60 msgs/sec × 600s = ~36k msgs per 10-minute session. Fine for hobby scale. Downgrade sync rate if hit.
- **Stage mismatch grief** (a player reaches stage 2 and their teammates at stage 1 are "left behind"): groups advance together, so this cannot happen within a group. A player who *dies* and restarts at stage 1 will be pulled out of the stage-2 group by the next matchmake call — matching the user's rule.
- **React re-render cost from peer updates**: store peer positions in a ref map (keyed by id), read inside `useFrame`. Only write to Zustand on presence join/leave, not on every position tick.
- **Host migration correctness**: deterministic via min `joined_at`; all clients compute independently from the same presence state, so they agree without coordination.
- **Player going AFK in a group slot**: after 60s of no heartbeat, server-side prune drops them and decrements `member_count`, freeing the slot.
