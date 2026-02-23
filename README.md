# Runway Review

A browser-based IDE workspace with multi-file editing, username-based restore/save, TSX function processing, and a review playback system.

```text
 ____  ____   ___      _ ______ ____ _____
|  _ \|  _ \ / _ \    | |  ____/ ___|_   _|
| |_) | |_) | | | |   | | |__  \___ \ | |
|  __/|  _ <| |_| |___| |  __|  ___) || |
|_|   |_| \_\\___/_____|_|_|    |____/ |_|
```

## What This Is

- SPA-style coding workspace with route-based pages (`/page/:id`)
- Up to 10 ghost pages that can be activated/deactivated
- File sidebar + open-window tabs in navbar
- Editor-first workflow with explicit first save, then auto-save
- Supabase-backed workspace persistence by username
- TSX code processor for named functions + exact line spans
- Full-screen review mode with synced highlights/readout + scanline

```text
 _____ _____    _    _____ _   _ ____  _____ ____
|  ___| ____|  / \  |_   _| | | |  _ \| ____/ ___|
| |_  |  _|   / _ \   | | | | | | |_) |  _| \___ \
|  _| | |___ / ___ \  | | | |_| |  _ <| |___ ___) |
|_|   |_____/_/   \_\ |_|  \___/|_| \_\_____|____/
```

## Features

- Username-only access (no password in this phase)
- Save/restore code documents per user workspace
- Right-click delete flow for files (with confirm modal)
- Review modal:
- Auto-scroll + manual override
- Function-synced readout overlays
- Persistent completed readout blocks
- Neon vertical scanline progression
- Code processor modal (TSX only):
- Named function extraction
- Accurate total line count
- Function start/end line coverage

```text
 ____  _____ ____  _   _ ___ ____  _____ __  __ _____ _   _ _____ ____
|  _ \| ____|  _ \| | | |_ _|  _ \| ____|  \/  | ____| \ | |_   _/ ___|
| |_) |  _| | |_) | | | || || |_) |  _| | |\/| |  _| |  \| | | | \___ \
|  _ <| |___|  __/| |_| || ||  _ <| |___| |  | | |___| |\  | | |  ___) |
|_| \_\_____|_|    \___/|___|_| \_\_____|_|  |_|_____|_| \_| |_| |____/
```

## Requirements

- Node.js `>=22.12.0` (tested with Node 25)
- npm

```text
 ____  _   _ _   _ _   _ ___ _   _  ____
|  _ \| | | | \ | | \ | |_ _| \ | |/ ___|
| |_) | | | |  \| |  \| || ||  \| | |  _
|  _ <| |_| | |\  | |\  || || |\  | |_| |
|_| \_\\___/|_| \_|_| \_|___|_| \_|\____|
```

## Running Locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

```text
 ____  _   _ ____   _    ____    _    ____  _____
/ ___|| | | |  _ \ / \  | __ )  / \  / ___|| ____|
\___ \| | | | |_) / _ \ |  _ \ / _ \ \___ \|  _|
 ___) | |_| |  __/ ___ \| |_) / ___ \ ___) | |___
|____/ \___/|_| /_/   \_\____/_/   \_\____/|_____|
```

## Supabase Setup

Add these values in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE`
- `SUPABASE_ACCESS_TOKEN` (for Supabase CLI commands)

Then run your migration flow (for example `supabase db push` if your local setup is already linked).

```text
 ____ _____ ____  _   _  ____ _____ _   _ ____  _____
/ ___|_   _|  _ \| | | |/ ___|_   _| | | |  _ \| ____|
\___ \ | | | |_) | | | | |     | | | | | | |_) |  _|
 ___) || | |  _ <| |_| | |___  | | | |_| |  _ <| |___
|____/ |_| |_| \_\\___/ \____| |_|  \___/|_| \_\_____|
```

## Structure

```text
src/
  components/
    <ComponentName>/
      <ComponentName>.tsx
      <ComponentName>.css
  routes/
    __root.tsx
  styles/
    base.css
    editor.css
    index.css
```

The project follows `methodology/METHOD_OPERATIONS.md`:
- Pure CSS only
- Component-scoped CSS files (no giant stylesheet)
