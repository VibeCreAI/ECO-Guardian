# ECO Guardian

ECO Guardian is a pixel-styled survival action game built with React, Vite, React Three Fiber, and Zustand. You fight through polluted biomes, answer Gaia's sustainability prompts, and spend saved CO2 in the Eco-Exchange between battles.

This project no longer uses Google AI Studio or Gemini APIs.

## Stack

- React 18
- Vite 5
- Three.js with `@react-three/fiber` and `@react-three/drei`
- Zustand for game state
- Express API for leaderboard routes
- Supabase for persistent leaderboard storage
- Vercel for static hosting plus serverless API deployment

## Local Development

Prerequisites:

- Node.js 18+
- npm

Install dependencies:

```bash
npm install
```

Run the frontend dev server:

```bash
npm run dev
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8080`, so if you want the leaderboard API locally, run the backend in a second terminal:

```bash
node server.js
```

If you only need the production-style local server, use:

```bash
npm start
```

That command builds the app and serves it through `server.js` on port `8080`.

## Environment Variables

The app works without Supabase, but leaderboard requests will fall back to default local scores.

Set these variables if you want persistent leaderboard data:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Recommended local setup:

- `.env.local` for local secrets
- Vercel project environment variables for deployed environments

## Scripts

```bash
npm run dev    # Vite dev server
npm run build  # Production build to dist/
npm start      # Build + serve through Express
```

## Project Structure

```text
api/          Vercel serverless API entry
components/   Game scene and UI components
public/       Static audio and image assets
store/        Zustand game and AI-director state
dist/         Production build output
```

## Deploying To Vercel

This repo is already structured for Vercel:

- `npm run build` outputs to `dist/`
- `vercel.json` routes `/api/*` to `api/index.js`
- the frontend can be hosted as static files while the leaderboard runs as a Node function

Before deploying, set these Vercel environment variables if you want the real leaderboard backend:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Deployment checklist:

1. Install dependencies with `npm install`
2. Confirm the app builds with `npm run build`
3. Link the repo to a Vercel project
4. Add the Supabase environment variables in Vercel
5. Deploy

If Supabase is not configured, the deployed game still works, but the leaderboard will use fallback scores instead of stored records.
