# Taskify

A small, intentionally minimal task list built with vanilla HTML, CSS, and JavaScript. **Taskify** keeps the spirit of a classic DOM-first todo demo—add, complete, edit, and delete—while layering in **local persistence**, **accessible markup**, **responsive layout**, and **light/dark themes** so it feels credible in a portfolio without pretending to be a product suite.

---

## Overview

Taskify is a client-side single-page experience served through optional PHP shims for hosting flexibility: open `index.html` directly, run PHP’s built-in server, or ship the included Docker image. No build step, no framework lock-in—just readable code you can explain in an interview.

---

## Features

| Area | What you get |
|------|----------------|
| Tasks | Add, mark complete, inline rename (double-click label), delete |
| Persistence | Tasks stored in `localStorage` (survives refresh) |
| Feedback | Inline messages instead of blocking `alert()` dialogs |
| Themes | Light/dark with **system default** until the user picks a preference |
| Empty state | Copy and layout when the list has no items |
| Progress | “Completed X of Y” summary |
| Bulk | **Clear completed** when there is at least one done task |
| Edit UX | **Enter** to save rename, **Escape** to cancel |
| Deploy | Dockerfile + optional Render Blueprint |

---

## Architecture

```
ToDoApp/
├── Dockerfile              # PHP CLI + built-in server (port 80)
├── render.yaml             # Render Blueprint (Docker web service)
├── LICENSE
├── README.md
└── src/
    ├── index.html          # App shell, landmarks, form
    ├── index.php           # `include` wrapper for PHP hosts
    ├── app.js              # State, persistence, DOM rendering
    ├── style.css           # Tokens, layout, themes
    └── favicon.svg
```

- **State**: In-memory array of `{ id, text, completed }`, synced to `localStorage` on every meaningful change.
- **Rendering**: List is rebuilt from state (`render()`) to avoid the original “count completed by walking the DOM on every body click” pattern.
- **PHP**: `index.php` includes `index.html` so shared hosts that default to PHP still serve the app; the app does not use a server API.

---

## Screenshots

Add your own captures here for the portfolio case study:

| Placeholder | Suggested capture |
|-------------|-------------------|
| `docs/screenshots/home-light.png` | Main view, a few tasks, light theme |
| `docs/screenshots/home-dark.png` | Same, dark theme |
| `docs/screenshots/mobile.png` | Narrow viewport, add bar stacked |
| `docs/screenshots/empty.png` | Empty state |

*(Create a `docs/screenshots/` folder in your fork when you add images.)*

---

## Local setup

### Option A — Open the file

Double-click `src/index.html` or open it from your editor’s live preview. Persistence uses `localStorage` for the file’s origin (browser-dependent).

### Option B — PHP built-in server (recommended)

From the **repository root**:

```bash
php -S localhost:8000 -t src
```

Visit `http://localhost:8000` — `index.php` will serve the app.

### Option C — Docker

```bash
docker build -t taskify .
docker run --rm -p 8080:80 taskify
```

Open `http://localhost:8080`.

---

## Deployment

### Docker (generic)

Build and run as above, or push to a registry and run on any container host listening on port **80** in the container.

### Render

This repo includes `render.yaml`. In the [Render](https://render.com) dashboard, create a **Blueprint** from the repo or add a **Web Service** with **Docker** and point to the root `Dockerfile`. Set the **health check path** to `/` (already in the Blueprint).

**Note:** Verify `region` and `plan` in `render.yaml` match your account; adjust if needed.

---

## Environment variables

There are **no server-side secrets** in this project: everything runs in the browser.

Optional client-only keys are **not used**. If you fork and add a backend later, document variables here (e.g. `DATABASE_URL`, `SESSION_SECRET`).

---

## Tech stack

- HTML5 (semantic landmarks, form validation hints)
- CSS (custom properties, `prefers-color-scheme`, `prefers-reduced-motion`)
- JavaScript (ES modules not required; compatible with file or server origin)
- PHP (optional static file server / include shim)
- Docker (production-like container demo)

---

## Lessons learned

- **Single source of truth** beats incremental DOM surgery for anything you need to persist or test.
- **`localStorage` JSON** is enough for a portfolio piece; it fails gracefully if storage is full or disabled.
- **Theme preference**: respecting `prefers-color-scheme` until the user overrides reads as thoughtful product sense.
- **Vanilla** stays maintainable if modules are logical functions and the README explains deployment paths.

---

## Roadmap (ideas)

- [ ] Import / export JSON for backups
- [ ] Optional due dates (still client-only)
- [ ] Single-column keyboard navigation (arrow keys between rows)
- [ ] PWA manifest + offline shell (still static)
- [ ] Replace PHP shim with pure static hosting notes only (if you drop PHP hosts)

---

## Acknowledgements

- Original **Taskify** concept and DOM-first approach from this repo’s earlier iteration.
- Design direction: keep the **teal / calm** palette, refine—not replace—the personality.

---

## License

See [LICENSE](./LICENSE) (MIT).
