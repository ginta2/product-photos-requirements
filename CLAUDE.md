# Product Photos Requirements

## Project
Persuasion artifact for the HelloFresh creative team: document all product-image aspect ratios in production, and provide a hands-on crop viewer tool so the impact of single-ratio shooting is visible.

## Key files
- `surfaces.md` — machine-readable surface inventory (24 rows). Parsed at runtime by the viewer.
- `viewer/` — static HTML/CSS/JS crop preview tool. No build step.
- `Product Images Guidelines.md` — the persuasion doc for creative.
- `BACKLOG.md` — what's in progress, what's next, what's parked. **Check this before starting work.**

## Conventions
- Vanilla JS only. No frameworks, no build pipeline.
- `surfaces.md` is the single source of truth — the viewer reads it, the guidelines doc references it. Don't duplicate surface data.
- All images are center-cropped in production (`object-fit: cover; object-position: center`). The viewer must mirror this exactly.
- Safe zones from the existing PDF: Conservative (200/120px margins on 1200×800 source), Usable (66/60px margins).

## Workflow
- Serve locally with `python3 -m http.server 8080` from the project root, then open `http://localhost:8080/viewer/`.
- Test with a real 3:2 recipe photo (1200×800 minimum).
