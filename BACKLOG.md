# Backlog

## In Progress

_None._

---

## Up Next

### Phase B — Important improvements (next sprint)

- **Input spec panel** above the empty state: pixel density, file format, color profile, max file size, CCM ID convention, Cloudinary transforms. One-screen reference for creative when shooting/exporting.
- **Min/max range columns** in specs table — populate `min_width`, `max_width` for fluid surfaces (Web Store grid uses `minmax(300px, 1fr)`, drifts ratio 1.5:1 → 2.5:1). Show worst-case for planning.
- **User journey grouping filter** alongside the platform filter: Discovery / Selection / Confirmation / Cooking / Post-meal. Frames conversation around CX, not file structure. *(Note: data is already in surfaces.md `Journey` column; just needs a filter UI.)*

### Phase C — Polish

- **Tile click → expandable detail** with full surface name, code source path, optional product screenshot link. Helps creative locate the surface in the actual product.
- **Status badge** per row (Confirmed / TBD / A-B test). Founder/Creator profile is currently TBD.

### Pin down Founder/Creator profile location
- Confirmed visually in screenshots but code location not pinned. Update `surfaces.md` once located.

---

## Parked (v2 / later)

### Brand variations
- Original audit only covered HelloFresh. GreenChef, EveryPlate, Factor, Chef's Plate likely use the same code paths but may have different image specs (color profile, naming). Confirm with brand leads before expanding scope.

### Locale variations
- DE/UK/AU markets — same surfaces? Same crops? Likely yes (shared code) but worth a one-line confirmation per locale.

### Cloudinary transform inventory
- Document what density/format variants are generated server-side. Confirms 1200×800 source is sufficient for retina (likely yes).

### CCM upload pipeline specs
- Formal creative deliverable contract: file format, color profile, naming, max file size. Append once confirmed with CCM team.

### Surface analytics / actual traffic data
- P0/P1/P2 priorities are informed guesses. Data team can refine with impression counts.

### A/B test surfaces
- Feature-flagged code paths not in main bundle. Could include emerging variants of P0 surfaces.

### Loading / error / empty image states
- Shimmer placeholders match dimensions but are not photographic. Document for completeness.

### Accessibility
- Alt-text patterns and image-off scenarios. Out of scope for the visual crop pitch, but worth a follow-up.

### Side-by-side compare mode
- Show same image at 3:2 vs. 2:3 simultaneously. Lower priority — list layout already makes the difference obvious.

### Marketing / CRM / Push surfaces
- Email hero, push notification thumbnail, share card. Lives in a separate codebase. Requires separate audit.

### Focal-point / smart crop support
- Production uses center crop everywhere today. If engineering adds focal-point metadata, viewer should support `object-position` override per surface.

### Auto-sync surfaces.md from code
- A codemod or AST-based scraper that regenerates the table. Surfaces change slowly — manual is fine for now.

### Per-breakpoint responsive previews (Web)
- Could add a viewport-width slider. Overkill for the creative pitch.

---

## Done

### Phase A — Critical improvements (Jun 2026)
- Wired safe-zone overlay onto tiles + empty-state shapes (Conservative, Usable, 2:3 survival zone)
- Added fixed/flexible dimension chips on tiles (🔒 / ↔) + new "Fixed dim" / "Flex dim" columns in specs table
- Added `Priority` field (P0/P1/P2) to surfaces.md with sort + "P0 only" filter
- Added crop-loss % badge per tile/shape (e.g., "67% width visible") with green/yellow/red severity
- Added label slot rendering on empty-state cards
- Added `Journey` field with badges (Discovery/Selection/Confirmation/Cooking/Post-meal)
- Updated `Product Images Guidelines.md` with Fixed/Flex section, Priority section, Scope & Known Unknowns

### Earlier work
- Audit of all 3 repos (web, ios, shared-mobile-modules) — 30 surfaces identified
- Confirmed center-crop behavior on all platforms (no stretching)
- `surfaces.md` written and populated (now 11 columns including priority/fixed/flex/journey)
- `Product Images Guidelines.md` persuasion doc written
- Viewer v1 built — aspect-ratio bug fixed, modal upload, filter tabs, list layout, specs table
- Viewer restyled with HelloFresh Zest design tokens (light cream theme)
- Repo created: `ginta2/product-photos-requirements` (storage only, no deploy)
