# Local Asset Layout

Files inside `public` are served directly by Vite and by `server.js`, so anything placed here is available at `/assets/...`.

Use this layout for the current game:

```text
public/assets/
  audio/
    music/
      menu.mp3
      battle.mp3
      boss.mp3
      stage_1.mp3
      stage_2.mp3
      ...
      stage_10.mp3
    sfx/
  images/
    bosses/
      boss_1.png
      boss_2.png
      ...
      boss_10.png
    player/
      idle.png
      walk-south.png
      walk-north2.png
      walk-east.png
      walk-west.png
    start/
      background.png
      favicon.png
      og_image.png
      title2.png
    ui/
```

Notes:

- Keep the filenames above if you want the current code to pick them up automatically.
- `images/ui` and `audio/sfx` are reserved for future menu art, icons, and one-shot sounds.
- If you add a new asset category later, extend `assets.ts` so the path stays centralized.
