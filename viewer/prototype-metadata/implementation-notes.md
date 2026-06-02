# Implementation Notes

## Zest Coverage
- 100% of color values mapped to HelloFresh Zest design tokens
- Full alias + component token hierarchy (30+ tokens)
- Legacy CSS variables preserved as mapped aliases for JS compatibility

## Theme Changes (Dark to Light)
- Page background: #111 (dark) -> #FAF8F3 (layout-cream.50)
- Card surfaces: #1c1c1e -> #EFE9DE (layout-cream.100)
- Hover states: #2c2c2e -> #E0D9CB (layout-cream.200)
- Text primary: #f0f0f0 -> #232323 (action-black.900)
- Text secondary: #888 -> #656565 (action-black.600)
- Borders: #333 -> #D3CAB7 (layout-cream.300)
- Modal surface: dark -> #FFFFFF (white, per HF modal pattern)
- Buttons: blue accent -> #232323 black (HF primary button pattern)

## Layout Notes
- All structural HTML unchanged — only CSS color/radius/shadow values modified
- Sticky header and filter bar backgrounds updated to match page background
- Card hover uses elevation-level2 (#E0D9CB) instead of border-color change
- Cards use no border (HF flat style) instead of dark-theme bordered cards

## Preserved Functional Colors
- Portrait badge: red (#ff4a6a) — functional warning color, not brand
- Label slot overlays: yellow (#FFC832) — functional annotation color
- Drag-over state: uses brand-green (#369D5E) instead of old blue accent

## Interaction Notes
- Hover states change background color (not border) for cards
- Button hover darkens to #454545 (action-black.800)
- All transitions preserved at 0.15s

## Platform-Specific Notes
- Web: system font stack preserved (matches HF web usage)
- Checkbox accent-color set to #232323 (HF uses black for form controls)
- Select dropdowns: white background with cream border (HF pattern)

## Known Gaps
- No @font-face for Agrandir (intentionally kept system fonts per instructions)
- Brand logo not added (tool-specific UI, not a branded product page)
