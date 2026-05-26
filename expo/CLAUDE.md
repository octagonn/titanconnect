# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TitanConnect is a campus social platform for CSUF students built with Expo/React Native. It supports iOS, Android, and web from a single codebase.

## Commands

```bash
# Development
npm start              # Start with tunnel (works across networks)
npm run start:lan      # Start in LAN mode
npm run start:ios      # iOS Simulator
npm run start:android  # Android Emulator
npm run start:web      # Browser

# Quality
npm run lint           # ESLint via expo lint
npm test               # Run all Jest tests
npm test -- <file>     # Run a single test file (e.g. npm test -- profileUtils.test.ts)
npm test -- --watch    # Watch mode

# Database / Supabase
npm run supabase:start      # Start local Supabase emulator
npm run supabase:stop       # Stop local emulator
npm run supabase:db:push    # Push migrations to local/remote
npm run supabase:db:pull    # Pull schema from remote
npm run supabase:db:reset   # Reset local database
npm run supabase:link       # Link to TitanConnect Supabase project
npm run supabase:status     # Check connection status
```

## Architecture

### Routing — Expo Router (file-based)

All screens live in `app/`. Key segments:

- `app/(tabs)/` — Main tab navigator: home, events, messages, tap-in, profile
- `app/auth/` — Email/password sign-in and sign-up screens
- `app/chat/[id].tsx` — Individual chat (dynamic route)
- `app/post/[id].tsx` — Post detail (dynamic route)
- `app/profile/` — Profile viewing and editing
- `app/_layout.tsx` — Root layout; handles deep-link routing for email verification (`myapp://verify-email`)
- `app/api/[...route]+api.ts` — Expo API route that forwards to the Hono/tRPC server

### API Layer — tRPC + Hono

`backend/` contains the server-side code:

- `backend/hono.ts` — Hono HTTP server that mounts tRPC
- `backend/trpc/app-router.ts` — Root `AppRouter` (export used by the tRPC client for end-to-end types)
- `backend/trpc/create-context.ts` — Request context; provides `publicProcedure` and `protectedProcedure` (requires Bearer token)
- `backend/trpc/routes/` — Feature routes: `posts/`, `connections/`, `messages/`, `profiles/`, `profile-qr/`, `reports/`

Client-side tRPC setup: `lib/trpc.ts`. The base URL comes from `EXPO_PUBLIC_API_URL` (falls back to localhost). Requests attach the Supabase session token as a Bearer header.

### State Management

- **Server state**: React Query (`@tanstack/react-query`) via tRPC hooks — primary data-fetching mechanism
- **Auth state**: `contexts/AuthContext.tsx` — exposes `currentUser`, `isAuthenticated`, `session`, and auth actions (`signInWithEmailAndPassword`, `signUpWithEmailAndPassword`, `signOut`, `updateUser`, `resendVerification`)
- **App state**: `contexts/AppContext.tsx` — connections list, conversations, unread counts
- Note: Zustand is listed in `package.json` but is not actively used; React Context is the pattern in use.

### Authentication — Supabase Auth

- Client: `lib/supabase.ts` — Supabase JS client with AsyncStorage (mobile) / localStorage (web) session persistence
- Flow: email/password sign-up → email verification deep link → profile setup (faculty/major/interests) → app access
- `protectedProcedure` in the tRPC context validates the Bearer token against Supabase before resolving

### Database — Supabase PostgreSQL

- Migrations: `supabase/migrations/` (version-controlled)
- Schema reference: `supabase-schema.sql`
- Real-time subscriptions power the messaging feature (`hooks/useMessageRealtime.ts`)
- Row-level security (RLS) is enabled on all tables

### Styling

NativeWind (Tailwind-like utility classes) is the primary styling approach. `styles/` contains shared style utilities. Lucide React Native and Expo Vector Icons are used for icons.

### Testing

- Framework: Jest with `jest-expo` preset, running in `node` environment
- Setup: `tests/setupJest.js`
- Supabase is mocked globally via `mocks/supabase.ts`
- Path alias `@/*` resolves to the repo root in both source and tests
- Test files live in `tests/`

### Key Conventions

- Path alias `@/` maps to the project root — use it for all imports instead of relative paths
- `protectedProcedure` must be used for any tRPC route that accesses user-specific data
- Schema validation uses Zod v4 (`zod` package)
- Deep links use the `myapp://` scheme

## Knowledge Graph

After making any code changes, update the project knowledge graph by invoking the graphify skill:

```
/graphify update
```

This keeps the graph in sync with the latest codebase so future queries reflect current state.
