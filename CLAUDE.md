# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

PWA for managing tennis tournaments and sparring sessions among friends. Two modes: **Sparring** (2 players, unlimited matches) and **Tournament** (3+ players, round-robin).

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build to dist/
npm run lint      # ESLint (flat config, JS/JSX only)
npm run preview   # Preview production build locally
```

Deploy: `npx vite build && netlify deploy --prod --dir=dist`

## Tech stack

- React 19 + Vite 7, Zustand 5 (persist middleware -> localStorage), React Router 7, Tailwind CSS 4, Supabase (PostgreSQL, JSONB, public RLS), PWA via vite-plugin-pwa

## Architecture

### Routing

Uses **react-router-dom** with `BrowserRouter` (wrapped in `main.jsx`). Routes defined in `App.jsx`:
- `/` -> `TournamentList` (dashboard, loads all tournaments from Supabase)
- `/nowy/sparing` -> `SparringSetup`
- `/nowy/turniej` -> `TournamentSetup`
- `/turniej/:id` -> `TournamentLoader` -> `TournamentView` (active/completed tournament with tabs)
- `/sparing/:id` -> `TournamentLoader` -> `TournamentView` (active/completed sparring with tabs)
- `*` -> NotFound page (Polish)

**TournamentLoader** (`src/components/Tournament/TournamentLoader.jsx`) handles fetching tournament data by URL `:id` from Supabase if not already in Zustand store. Shows loading spinner and error states in Polish.

**Backwards compatibility**: Old `?state=` pako-encoded URLs are still handled in `App.jsx` via `getStateFromUrl()` from `stateEncoder.js`. They import the state and redirect to the clean route.

**Sharing**: `ShareModal` generates clean URLs like `/turniej/{id}` or `/sparing/{id}` instead of encoding entire state in URL.

**Navigation pattern**: Setup components (`SparringSetup`, `TournamentSetup`) call `startTournament()` on Zustand, then read `useTournamentStore.getState().id` and `navigate()` to the tournament route. Back buttons use `navigate('/')`. The Zustand `status` field is still set by store actions but navigation is driven by the router.

### State management

Single Zustand store (`src/store/tournamentStore.js`) is the source of truth. Key patterns:
- **Persist v4** with custom localStorage storage (handles QuotaExceededError by truncating changeLog)
- **Auto-sync to Supabase**: subscriber watches state changes, debounced 1s, auto-retry 5s on error
- **Realtime sync**: Supabase Realtime subscription per loaded tournament, with own-save suppression
- **Auto-expire**: tournaments older than 24h are marked completed on load
- **Sparring never auto-completes** -- requires manual end via `endTournament()`
- localStorage key: `tennis-tournament-storage`

### Data mapping

JS uses camelCase, Supabase uses snake_case. Mapping is in `src/services/storageService.js` (`toDbRow`/`fromDbRow`). The `game_type` column is optional -- code retries without it if the column doesn't exist.

### Supabase

- Table: `tournaments` with JSONB columns (players, matches, settings, change_log)
- RLS: public access (no auth)
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (set in Netlify)

## Conventions

- **UI language:** Polish with full diacritics
- **Light mode only** -- no dark mode
- **Mobile-first** -- sticky header, fixed bottom nav on mobile; sidebar + top nav on xl breakpoints
- Player avatars: colored circles with initials (name hash -> color, see `PlayerAvatar.jsx`)
- Scores: `score1`/`score2` = sets won; `sets[]` = optional gem scores per set as `[gems1, gems2]`
- ESLint: `no-unused-vars` ignores names starting with uppercase or underscore (`varsIgnorePattern: '^[A-Z_]'`)

## Deployment

- Live: https://tennis-turniej.netlify.app
- GitHub: https://github.com/gubiplz/tennis-tournament
- Supabase project: Tenis-turniej (https://bwajkdtbcnuxhjmfyyro.supabase.co)
- Netlify has SPA redirect (`/* -> /index.html` with 200 status) in `netlify.toml`

## Known limitations

- No auth -- anyone can edit any tournament
- Old pako-encoded share URLs (`?state=`) still work but are no longer generated
