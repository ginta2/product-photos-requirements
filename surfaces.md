# Product Photo Surfaces — Aspect Ratio Inventory

**Source:** Audit of `web`, `ios`, `shared-mobile-modules` repos as of 2026-06-02.
**Convention:** Ratios written as `W:H`. Portrait ratios noted explicitly. "Dynamic" = ratio depends on container width at runtime.
**Source baseline:** Creative ships at **3:2, 1200×800 min**.
**Read this file as data:** the table below is parsed by the viewer at runtime to render crop previews. Keep column order stable.

**Column glossary:**
- **Priority** — P0 (high traffic / every active customer), P1 (medium), P2 (niche/edge)
- **Fixed Dim** — dimension locked by design (creative cannot change). Most often a height in px/pt.
- **Flex Dim** — dimension that scales with viewport/container. Range noted where known.
- **Journey** — user step the surface belongs to: Discovery, Selection, Confirmation, Cooking, Post-meal

## Surfaces

| Surface | Platform | Ratio | Resolution (rendered) | Has Label | Label Position | Priority | Fixed Dim | Flex Dim | Journey | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| My Menu — recipe card (normal) | Web | 16:9 | 768×432 | Yes | Top-right (Customizable meal) | P0 | — | both | Selection | `apps/web/spaces/menus/modules/section/utils/recipe.ts:9-10` |
| My Menu — recipe card (large) | Web | 3:2 | 1152×768 | Yes | Top-right | P0 | — | both | Selection | `apps/web/spaces/menus/modules/section/utils/recipe.ts:9-10` |
| Store / Past Orders / Favorites — recipe card | Web | Dynamic (fluid width × fixed height) | h=202px (large), h=120px (small) | Yes | Top-right + bottom-left | P0 | h=202px / h=120px | width 300–680px | Selection | `apps/web/features/product-card-feature/constants/constants.ts:11` |
| Cart — recipe thumbnail | Web | 1:1 | 72×72 (mobile), 90×90 (desktop) | No | — | P0 | h=72px | 72–90px (breakpoints) | Confirmation | `apps/web/spaces/deliveries/modules/cart/components/product-item/thumbnail/Thumbnail.tsx` |
| Product Detail / Recipe Detail | Web | ~2.4:1 (responsive) | 1200×500 desktop, smaller on mobile | Yes | Top-right (close button) | P0 | — | both | Cooking | `apps/web/spaces/recipe-detail/modules/main/components/RecipeImage/index.tsx` |
| Home — Order Management Card | iOS | 1:1 | dynamic | No | — | P0 | — | both | Selection | `RecipesHorizontalCardsTransformer.swift:64` |
| Home — Recipe List Card (swimlane) | iOS | 1:1 | 68×68pt | No | — | P1 | both | — | Selection | `HomeMyDeliveriesFeature/.../RecipesListView.swift:80` |
| Weekly Menu — recipe card | iOS | ~1.75:1 (close to 5:3) | ~350×200pt | Yes | Top-right + bottom-left | P0 | — | both | Selection | `SingleWeekFeature/.../RecipeCarouselView.swift:50` |
| Cart — recipe thumbnail | iOS | 1:1 | 56×56pt | No | — | P0 | both | — | Confirmation | `EditableOrderSummaryFeature/.../EditableOrderSummaryRecipeView.swift:46` |
| Customization — recipe thumbnail | iOS | 1:1 | 72×72pt | No | — | P1 | both | — | Confirmation | `CustomizationAndPairingFeature/.../CustomizationAndPairingDrawerView.swift:92` |
| Recipe Detail — header (parallax) | iOS | Variable (full-width parallax) | min height 220pt | No | — | P0 | width=full-bleed | height (scroll-driven) | Cooking | `ProductUIComponents/.../ProductHeaderViewDetailsStyle.swift:38` |
| Past Orders Rating — v1 | iOS | 5:3 | full-width × 200pt | No | — | P1 | h=200pt | width=full-bleed | Post-meal | `UserRatingFeature/.../RecipeCardHeaderView.swift:54` |
| Past Orders Rating — v2 (new) | iOS | **2:3 portrait** | floor(2/3 screen width) square-ish | No | — | P0 | width=2/3 screen | — | Post-meal | `UserRatingFeature/.../RecipeCardHeaderView.swift:62-63` |
| Add-on / Food Item Carousel | iOS | ~5:7 (~0.68:0.95) | scales with carousel height | No | — | P2 | — | both (carousel) | Selection | `FoodItemCarousel/.../FoodItemsCarouselView.swift:74` |
| Recipe Ingredient thumbnail | iOS | 1:1 | 120×120pt | No | — | P2 | both | — | Cooking | `RecipeIngredientCell.swift:63` |
| Cookbook — "Meals from your box" carousel | iOS / Android | **2:3 portrait** | 160w × 240h | Yes | Bottom-right (time pill) | P0 | both | — | Discovery | `src/features/this-weeks-box-widget/styles.ts` (`aspectRatio: 2/3`) |
| Cookbook — Collections grid ("Saved by you") | iOS / Android | 1:1 | min 163×163 | Optional | Bottom-left (platform tag) | P1 | — | both | Discovery | `src/modules/social-recipe-bridge/components/cookbook-grid-card/styles.ts:11` |
| Cookbook — Recently Saved carousel | iOS / Android | 3:2 landscape | 160×107 | No | — | P1 | both | — | Discovery | `src/modules/social-recipe-bridge/components/recently-saved-recipe-card/styles.ts:13` |
| Cookbook — Recipe list item (collection detail) | iOS / Android | 1:1 | ~39% container width | No | — | P1 | — | both | Discovery | `src/modules/social-recipe-bridge/screens/collection-detail/components/recipe-list-item/styles.ts:13` |
| Cookbook — Collection card thumbnail (header) | iOS / Android | 2:1 wide | full width × 50% height | No | — | P1 | — | both | Discovery | `src/modules/social-recipe-bridge/components/collections/collection-card/styles.ts:10` |
| Discover Hub — carousel recipe card (Top this week, Highly rated, etc.) | iOS / Android | **2:3 portrait** | 164w × 246h | Yes | Top-right (bookmark icon) | P0 | both | — | Discovery | `src/features/discovery-hub/recipe-card/constants.ts` |
| Discover Hub — recommendation card (gradient overlay) | iOS / Android | Portrait (variable) | 300h standard / 450h swipe | Yes | Bottom (gradient title overlay) | P1 | h=300/450pt | width=full-bleed | Discovery | `src/modules/social-recipe-bridge/components/cookbook-recommendations/recommendation-card/styles.ts` |
| Recipe Hub — Saved/Recent/Popular sections | iOS / Android | 1.56:1 landscape | 200×128 | No | — | P1 | both | — | Discovery | `src/modules/recipe-hub/screens/home/section/Section.tsx` |
| Mobile Menu — "Your meals" preselected card (large) | iOS / Android | Dynamic (fluid width × 202h) | h=202 | Yes | Top-left (badge) + bottom-right (cart stepper) | P0 | h=202pt | width=container | Selection | `src/features/product-card-feature/variants/edit/components/EditLargeCard.tsx` (`size={{ height: 202 }}`) |
| Mobile Menu — "Your meals" preselected card (small / preselections strip) | iOS / Android | 1:1 | 140×140 | Yes | Top-left (badge) | P0 | both | — | Selection | `src/features/product-card-feature/variants/edit/components/EditSmallCard.tsx` (`size={{ width: 140, height: 140 }}`) |
| Mobile Menu — "Your favourite recipes" carousel | iOS / Android | Fluid × 240h (favorite variant) | h=240 | Yes | Top-right (+ button) | P1 | h=240pt | width=container | Selection | `src/features/product-card-feature/variants/favorite/constants.ts:CARD_IMAGE_HEIGHT = 240` |
| Mobile Menu — Hub variant card (small in-row) | iOS / Android | 1:1 | 140×140 | Yes | Top-right | P1 | both | — | Selection | `src/features/product-card-feature/variants/hub/components/styles.ts` |
| Mobile Menu — Past Delivery card | iOS / Android | Fluid × 240h | h=240 | Yes | Top-left | P1 | h=240pt | width=container | Selection | `src/features/product-card-feature/variants/past-delivery/constants.ts:CARD_IMAGE_HEIGHT = 240` |
| Mobile Recipe Detail — header (rated state, full-bleed) | iOS / Android | Variable (full-bleed parallax) | min ~220pt height; visible ~480pt on iPhone | Yes | Top-left (back) + top-right (bookmark) + bottom-left (rating pill) | P0 | width=full-bleed | height (scroll-driven) | Cooking | `ProductHeaderViewDetailsStyle.swift:38` (iOS); RN equivalent in product-card-feature `details` variant |
| Founder/Creator profile — recipe grid | iOS / Android | 1:1 (visual) | TBD | Yes | Top-right (bookmark) | P2 | both | — | Discovery | TBD — code location not confirmed in audit |

## Notes

- **Critical for the creative team:** the surfaces marked **2:3 portrait** in bold are the key pain points. A 3:2 landscape source crops to roughly 44% of its width when forced into 2:3 — the sides are catastrophically lost.
- **Web responsive caveat:** Web's "Store / Past Orders" surface uses fixed height + fluid width inside a CSS grid (`minmax(300px, 1fr)`). The effective ratio drifts between ~1.5:1 and ~2.5:1 depending on viewport. The viewer represents this with the most common rendered width.
- **iOS Recipe Detail parallax:** No fixed ratio — the image stretches/compresses with scroll. The viewer skips this surface or shows it at min-height (220pt × full width).
- **Founder/Creator profile:** confirmed visually in screenshots but not yet pinned to a specific component file. Listed as TBD; will update once located.
- **Label slots (per existing PDF guidelines):** bottom-left for badges/tags, top-right for nav/customizable indicator. Photos must keep these areas visually clear of subject content.
- **Safe zones (per existing PDF on 3:2 base):** Conservative 200/120px margin, Usable 66/60px margin. The viewer overlays both on the source preview.
- **Fixed vs. Flex columns:** "both" = both dimensions are fixed (true ratio surfaces). "—" = dimension is N/A (e.g., parallax with no fixed bound). When `Fixed Dim` is a height/width value, that dimension is non-negotiable for creative — composition must work within it.
- **Priority rationale:** P0 surfaces are seen by every active customer in the core menu/cart/cooking flow + new portrait surfaces driving discovery. P1 = secondary discovery and confirmation contexts. P2 = niche or low-traffic (ingredient close-ups, food carousel add-ons, founder grids).
