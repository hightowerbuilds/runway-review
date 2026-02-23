# Runway IDE Project

This repository has been reset from the default template to a clean baseline.

## Requirements

- Node.js 22.12.0+
- npm

## Supabase Setup (Initial)

1. Copy `.env.example` to `.env` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_ACCESS_TOKEN` (for CLI migration commands)
2. Create the state table by applying:
   - `supabase/sql/001_workspace_code_state.sql`

The app now includes a `code-processing` state store with Supabase-ready
load/save methods (workspace-scoped) and local persistence fallback.

## Username Workspace (No Password)

This project currently uses a basic username-only workspace flow.  
Users enter a username, save code to Supabase, and restore code by using the same username.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
