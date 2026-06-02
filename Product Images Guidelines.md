# Product Images Guidelines — Digital Touchpoints

**Your one 3:2 source ships at 15+ different aspect ratios in production today.**

This document maps every in-product surface that displays recipe/product photography, documents the actual crop behavior, and proposes changes to the creative workflow so imagery survives all surfaces intact.

---

## How images are displayed in production

All platforms use **center crop** — never stretch, never distort:

| Platform | Mechanism |
|---|---|
| Web | `object-fit: cover` on `<img>` elements |
| iOS native | `contentMode = .scaleAspectFill` |
| Mobile (RN) | `resizeMode: 'cover'` + Cloudinary `c_fill, g_center` |

**Result:** Subject content is never distorted, but sides and/or top/bottom are sliced off when the surface ratio differs from the source.

---

## Surface Inventory

> Full machine-readable table: [`surfaces.md`](./surfaces.md)

### Web

| Surface | Ratio | Resolution | Labels |
|---|---|---|---|
| My Menu — recipe card (normal) | 16:9 | 768×432 | Top-right |
| My Menu — recipe card (large) | 3:2 | 1152×768 | Top-right |
| Store / Past Orders / Favorites | Dynamic (fluid × 202px) | varies | Top-right + bottom-left |
| Cart thumbnail | 1:1 | 72–90px | — |
| Product/Recipe Detail | ~2.4:1 responsive | 1200×500 desktop | Top-right |

### iOS

| Surface | Ratio | Resolution | Labels |
|---|---|---|---|
| Home — Order Management | 1:1 | dynamic | — |
| Home — Recipe List (swimlane) | 1:1 | 68pt | — |
| Weekly Menu card | ~1.75:1 | ~350×200pt | Top-right + bottom-left |
| Cart thumbnail | 1:1 | 56pt | — |
| Customization thumbnail | 1:1 | 72pt | — |
| Recipe Detail (parallax) | Variable (full-bleed) | min 220pt | — |
| Past Orders Rating v1 | 5:3 | full-width × 200pt | — |
| **Past Orders Rating v2** | **2:3 portrait** | floor(2/3 screen width) | — |
| Add-on / Food Item Carousel | ~5:7 | scales with carousel | — |
| Ingredient thumbnail | 1:1 | 120pt | — |

### Mobile (React Native / shared modules)

| Surface | Ratio | Resolution | Labels |
|---|---|---|---|
| **Cookbook — Meals from your box** | **2:3 portrait** | 160×240 | Bottom-right (time pill) |
| Cookbook — Collections grid | 1:1 | 163×163 | Bottom-left |
| Cookbook — Recently Saved | 3:2 | 160×107 | — |
| Cookbook — Collection card header | 2:1 wide | full width | — |
| Cookbook — Recipe list item | 1:1 | ~39% container | — |
| **Discover Hub — carousel card** | **2:3 portrait** | 164×246 | Top-right (bookmark) |
| Discover Hub — recommendation | Portrait (variable) | 300–450h | Bottom (gradient) |
| Recipe Hub — sections | 1.56:1 | 200×128 | — |
| Menu — preselected (large) | Dynamic × 202h | fluid | Top-left + bottom-right |
| Menu — preselected (small) | 1:1 | 140×140 | Top-left |
| Menu — favourites carousel | Fluid × 240h | fluid | Top-right |
| Menu — hub card (small) | 1:1 | 140×140 | Top-right |
| Menu — past delivery | Fluid × 240h | fluid | Top-left |
| Recipe Detail (rated, full-bleed) | Variable (parallax) | ~480pt visible | Multiple |

---

## The 2:3 Problem

Three production surfaces now display recipe imagery in **2:3 portrait** orientation:

1. **Discover Hub — carousel card** (164×246) — high-traffic discovery surface
2. **Cookbook — "Meals from your box"** (160×240) — returning-user engagement surface
3. **iOS Past Orders Rating v2** — feature-flagged, rolling out

### What happens to a 3:2 landscape source in 2:3 portrait

When a 1200×800 source (3:2) is center-cropped to 2:3:

- The **visible width** drops to ~533px out of 1200 — **44% of the frame is lost** on the sides
- Content in the left or right third of the image is completely clipped
- Plating details, garnish, and contextual props placed near edges vanish

This is not a minor crop. The subject needs to be centered within roughly **45% of the source width** to survive a 2:3 crop.

---

## Safe Zones (from existing PDF baseline)

Based on the 3:2 source at 1200×800:

| Zone | Left/Right margin | Top/Bottom margin | Usable area |
|---|---|---|---|
| Conservative | 200px (16.7%) | 120px (15%) | 800×560 |
| Usable | 66px (5.5%) | 60px (7.5%) | 1068×680 |

**Neither safe zone protects content from a 2:3 crop.** The Conservative zone preserves content for landscape ratios (16:9 through 3:2), but the 2:3 portrait crop extends well beyond both zones on the horizontal axis.

### Required safe zone for 2:3 survival

To keep subject content visible in a 2:3 center crop:
- Horizontal margin: **333px** per side (27.8% of source width)
- Vertical margin: 0px (full height is used)
- Usable width: **534px** (44.5% of source)

This is impractical for the creative team to work within on a 3:2 canvas.

---

## Recommendations

### Option A: Multi-ratio delivery (preferred)

Ship two variants per recipe:

| Variant | Ratio | Min resolution | Used by |
|---|---|---|---|
| Landscape (existing) | 3:2 | 1200×800 | All web + most iOS/mobile surfaces |
| Portrait (new) | 2:3 | 800×1200 | Discover Hub, Cookbook carousel, iOS Rating v2 |

**Trade-off:** Doubles photo pipeline work per recipe but guarantees optimal framing on all surfaces.

### Option B: Centered safe zone (compromise)

Keep single 3:2 source. Commit to a **strict centered composition rule**:
- All primary subject content within the center 45% of width (approx 534px on 1200w)
- Edges used only for context/atmosphere that can be lost

**Trade-off:** Zero pipeline change, but severely constrains creative composition. Wide plates, multi-dish shots, and contextual styling become impossible.

### Option C: Smart crop integration

Implement focal-point metadata in CCM, switch from center crop to focal-point crop on portrait surfaces.

**Trade-off:** Engineering investment required across all platforms. Partial solution — still won't save a subject placed at frame edge.

---

## Viewer Tool

A hands-on crop preview tool is available at:

```
viewer/index.html
```

Drop any 3:2 source image to see how it crops across all production surfaces. Use it to:
- Visualize the portrait crop loss immediately
- Test whether a specific photo's composition survives key surfaces
- Show the safe-zone overlay on the source to evaluate composition

Run locally: `open viewer/index.html` (or serve via `python3 -m http.server 8080` for full functionality).

---

## Out of scope (v2)

- Marketing emails, push notifications, share previews, landing pages, paid creatives
- Focal-point / non-center crop implementation details
- Per-breakpoint responsive web simulation
