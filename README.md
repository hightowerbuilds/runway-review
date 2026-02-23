# Runway Review

A browser-based IDE workspace with multi-file editing, username-based restore/save, TSX function processing, and a review playback system.


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
