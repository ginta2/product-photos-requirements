# Backlog

## In Progress

### Viewer Bug Fix + UX Redesign
- **Bug:** All crop tiles render the same shape — `aspect-ratio` CSS property is defeated by image intrinsic sizing. Fix: use `padding-bottom` percentage + absolute-position the img.
- **Redesign:** Upload button in header → modal. Filter tabs (not dropdown). List layout (not grid) so crop differences are visually obvious.
- See plan file for full implementation details.

---

## Up Next

### Safe-Zone Overlays on Tiles
- Add per-tile safe-zone rectangles (not just on source preview) so creative can see which area survives on each surface.
- Conservative (200/120px) and Usable (66/60px) from existing PDF, scaled proportionally to the tile's rendered size.

### Deploy to Vercel
- Push `viewer/` as output directory.
- Serve `surfaces.md` alongside (same static deploy).
- Share URL with creative team.

---

## Parked (v2 / later)

### Side-by-side compare mode
- Show same image at 3:2 vs. 2:3 simultaneously. Makes the portrait problem visceral. Low priority — the list layout already makes it obvious.

### Marketing / CRM / Push surfaces
- Out of scope for now. Only in-product surfaces are audited. Could add email hero, push notification thumbnail, share card, etc.

### Focal-point / smart crop support
- Production uses center crop everywhere today. If engineering adds focal-point metadata later, the viewer should support `object-position` override per surface.

### Auto-sync surfaces.md from code
- A codemod or AST-based scraper that regenerates the table. Surfaces change slowly — manual is fine for now.

### Per-breakpoint responsive previews (Web)
- Web surfaces have fluid widths that drift with viewport. Could add a viewport-width slider. Overkill for the creative pitch.

### Founder/Creator profile grid
- Confirmed visually in screenshots but code location not pinned. Update `surfaces.md` once located.

---

## Done

- Audit of all 3 repos (web, ios, shared-mobile-modules) — 24 surfaces identified
- Confirmed center-crop behavior on all platforms (no stretching)
- `surfaces.md` written and populated
- `Product Images Guidelines.md` persuasion doc written
- Viewer v1 built (has bugs, being fixed)
