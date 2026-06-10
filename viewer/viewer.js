(function () {
    const SURFACES_PATH = '../surfaces.md';

    const uploadBtn = document.getElementById('upload-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const controls = document.getElementById('controls');
    const gallery = document.getElementById('gallery');
    const emptyState = document.getElementById('empty-state');
    const tilesContainer = document.getElementById('tiles');
    const platformTabs = document.getElementById('platform-tabs');
    const safeZoneSelect = document.getElementById('safe-zone');
    const showLabelsCheckbox = document.getElementById('show-labels');

    const DEMO_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=800&fit=crop';

    const detailOverlay = document.getElementById('detail-overlay');
    const detailContent = document.getElementById('detail-content');
    const detailClose = document.getElementById('detail-close');

    // Navigation
    const mainNav = document.getElementById('main-nav');
    const viewSimulator = document.getElementById('view-simulator');
    const viewSpecs = document.getElementById('view-specs');
    const viewContext = document.getElementById('view-context');
    const viewRecommendation = document.getElementById('view-recommendation');
    const specsTabs = document.getElementById('specs-tabs');

    let surfaces = [];
    let imageUrl = null;
    let activeFilter = 'mobile-rn';
    let specsFilter = 'mobile-rn';
    let deviceWidth = 390;
    let simView = 'list'; // 'grid' | 'list'

    const DEVICE_PRESETS = {
        'all':       [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: '375px', width: 375 }, { label: '768px', width: 768 }, { label: '1280px', width: 1280 }, { label: 'Custom', width: 'custom' }],
        'web':       [{ label: '375px', width: 375 }, { label: '768px', width: 768 }, { label: '1280px', width: 1280 }, { label: '1440px', width: 1440 }, { label: 'Custom', width: 'custom' }],
        'mobile-rn': [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: 'Custom', width: 'custom' }],
        'portrait':  [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: 'Custom', width: 'custom' }],
        'p0':        [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: '375px', width: 375 }, { label: '768px', width: 768 }, { label: 'Custom', width: 'custom' }],
    };
    const PRESET_DEFAULT_WIDTH = {
        'all': 390, 'web': 375, 'mobile-rn': 390, 'portrait': 390, 'p0': 390
    };

    function parseSurfacesTable(markdown) {
        const lines = markdown.split('\n');
        const tableStart = lines.findIndex(l => l.startsWith('| Surface'));
        if (tableStart === -1) return [];

        const rows = [];
        for (let i = tableStart + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('|')) break;

            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            if (cells.length < 7) continue;

            // Backwards compatible: old 7-col format vs new 11-col format
            const isExtended = cells.length >= 11;
            rows.push({
                name: cells[0],
                platform: cells[1].toLowerCase(),
                ratioRaw: cells[2],
                ratio: parseRatio(cells[2]),
                resolution: cells[3],
                hasLabel: cells[4].toLowerCase() === 'yes',
                labelPosition: cells[5],
                priority: isExtended ? cells[6] : 'P1',
                fixedDim: isExtended ? cells[7] : '—',
                flexDim: isExtended ? cells[8] : '—',
                journey: isExtended ? cells[9] : 'Selection',
                source: isExtended ? cells[10] : cells[6]
            });
        }
        return rows;
    }

    function parseRatio(str) {
        const clean = str.replace(/\*\*/g, '').trim();

        const explicit = clean.match(/^~?(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)/);
        if (explicit) return parseFloat(explicit[1]) / parseFloat(explicit[2]);

        if (clean.toLowerCase().includes('portrait') && !explicit) return 2 / 3;

        const dim = clean.match(/(\d+)\s*[×x]\s*(\d+)/);
        if (dim) return parseInt(dim[1]) / parseInt(dim[2]);

        if (clean.toLowerCase().includes('dynamic') || clean.toLowerCase().includes('fluid')) return 16 / 9;
        if (clean.toLowerCase().includes('variable')) return 16 / 9;

        return 3 / 2;
    }

    function getPlatformKey(platform) {
        if (platform.includes('web')) return 'web';
        return 'mobile-rn';
    }

    function getPlatformBadges(platform) {
        const raw = platform.toLowerCase();
        var key = getPlatformKey(raw);
        var label = key === 'web' ? 'Web' : 'Mobile';
        return '<span class="empty-platform">' + label + '</span>';
    }

    function isPortrait(ratio) {
        return ratio < 1;
    }

    function cropLossText(widthPct, heightPct) {
        if (widthPct >= 100 && heightPct >= 100) return 'Full frame';
        var visibleArea = Math.round((Math.min(widthPct, 100) * Math.min(heightPct, 100)) / 100);
        if (heightPct < 100 && widthPct < 100) return visibleArea + '% visible · sides + top/bottom';
        if (heightPct < 100) return visibleArea + '% visible · top/bottom';
        return visibleArea + '% visible · sides';
    }

    function cropLossBadgeHtml(widthPct, heightPct, severityClass) {
        var text = cropLossText(widthPct, heightPct);
        if (text === 'Full frame') return '';
        var parts = text.split(' · ');
        return '<span class="loss-badge-inline ' + severityClass + '">' + parts[0] + '</span>'
            + (parts[1] ? '<span class="loss-badge-direction">' + parts[1] + '</span>' : '');
    }

    const DEFAULT_SOURCE_RATIO = 3 / 2;
    let sourceRatio = DEFAULT_SOURCE_RATIO;
    let sourceWidth = null;
    let sourceHeight = null;

    /**
     * Calculate what % of the source's WIDTH is preserved when the source is
     * center-cropped to the surface's aspect ratio. Width is the more intuitive
     * dimension to communicate to creative ("how much horizontal frame survives?").
     *
     * For a 3:2 source cropped to a target ratio R:
     *   - if R >= source ratio (target wider than source) → 100% width visible (height clipped)
     *   - if R < source ratio (target narrower) → width clipped to (R/sourceRatio) × 100%
     */
    function widthVisiblePct(targetRatio) {
        if (!targetRatio || targetRatio <= 0) return 100;
        if (targetRatio >= sourceRatio) return 100;
        return Math.round((targetRatio / sourceRatio) * 100);
    }

    // For wide surfaces (ratio > 3:2): what % of source HEIGHT is visible after center crop?
    function heightVisiblePct(targetRatio) {
        if (!targetRatio || targetRatio <= 0) return 100;
        if (targetRatio <= sourceRatio) return 100;
        return Math.round((sourceRatio / targetRatio) * 100);
    }

    function lossSeverity(pct) {
        if (pct >= 80) return 'good';
        if (pct >= 60) return 'warn';
        return 'bad';
    }

    const PRIORITY_ORDER = { 'P0': 0, 'P1': 1, 'P2': 2 };

    function sortByPriority(arr) {
        return arr.slice().sort((a, b) => {
            const pa = PRIORITY_ORDER[a.priority] ?? 99;
            const pb = PRIORITY_ORDER[b.priority] ?? 99;
            return pa - pb;
        });
    }

    function applyFilter(arr) {
        return arr.filter(s => {
            if (s.name === 'Past Orders Rating — v2 (new)') return false;
            if (activeFilter === 'all') return true;
            if (activeFilter === 'p0') return s.priority === 'P0';
            if (activeFilter === 'portrait') return isPortrait(s.ratio);
            return s.platform.split('/').some(p => getPlatformKey(p.trim().toLowerCase()) === activeFilter);
        });
    }

    /**
     * Returns chip data for a surface: which dimension(s) are fixed vs. flexible.
     * Used to overlay 🔒 / ↔ badges on tiles. Returns [] for fully-fixed tiles
     * (no chips needed since both dims are locked).
     */
    function parseFlexRange(flexDim) {
        if (!flexDim || flexDim === '—' || flexDim === 'both') return null;
        var rangeMatch = flexDim.match(/(\d+)\s*[–\-]\s*(\d+)\s*(px|pt)/);
        if (rangeMatch) {
            return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]), unit: rangeMatch[3] };
        }
        return null;
    }

    function parseFixedHeight(fixedDim) {
        if (!fixedDim || fixedDim === '—' || fixedDim === 'both') return null;
        var m = fixedDim.match(/h=(\d+)(px|pt)/);
        return m ? parseInt(m[1]) : null;
    }

    function computeRatioRange(surface) {
        var range = parseFlexRange(surface.flexDim);
        if (!range) {
            var fl = (surface.flexDim || '').toLowerCase();
            if (fl === 'width=container' || fl === 'width=full-bleed') {
                var h2 = parseFixedHeight(surface.fixedDim);
                if (!h2) return null;
                var r = deviceWidth / h2;
                return { min: r, max: r, single: true };
            }
            return null;
        }
        var h = parseFixedHeight(surface.fixedDim);
        if (!h) return null;
        return { min: range.min / h, max: range.max / h, single: false };
    }

    // For fluid/dynamic surfaces, use the device-computed ratio instead of the 16:9 fallback.
    // Falls back to surface.ratio for fixed surfaces.
    function getDisplayRatio(surface) {
        var range = computeRatioRange(surface);
        if (range) return range.min; // use min (narrowest viewport or single computed value)
        return surface.ratio;
    }

    var STANDARD_RATIOS = [
        { decimal: 16/9, label: '16:9' },
        { decimal: 5/3, label: '5:3' },
        { decimal: 3/2, label: '3:2' },
        { decimal: 4/3, label: '4:3' },
        { decimal: 7/4, label: '7:4' },
        { decimal: 2/1, label: '2:1' },
        { decimal: 12/5, label: '12:5' },
        { decimal: 1/1, label: '1:1' },
        { decimal: 2/3, label: '2:3' },
        { decimal: 3/4, label: '3:4' },
        { decimal: 9/16, label: '9:16' },
        { decimal: 5/7, label: '5:7' },
    ];

    function getRatioOrientation(r) {
        if (Math.abs(r - 1) < 0.02) return 'square';
        if (r > 1.9) return 'wide';
        if (r > 1) return 'landscape';
        if (r >= 0.6) return 'portrait';
        return 'tall';
    }

    function formatRatioInfo(r, surface) {
        var pill, nearestLabel, isApprox = false;

        // First try ratioRaw for an explicit W:H ratio
        if (surface && surface.ratioRaw) {
            var raw = surface.ratioRaw.replace(/\*\*/g, '').trim();
            var explicit = raw.match(/^~?(\d+):(\d+)/);
            if (explicit) {
                pill = explicit[1] + ':' + explicit[2];
                nearestLabel = pill;
            }
        }

        if (!pill) {
            // Try exact standard match
            var exactMatch = null;
            for (var i = 0; i < STANDARD_RATIOS.length; i++) {
                if (Math.abs(r - STANDARD_RATIOS[i].decimal) < 0.02) {
                    exactMatch = STANDARD_RATIOS[i].label;
                    break;
                }
            }
            if (exactMatch) {
                pill = exactMatch;
                nearestLabel = exactMatch;
            } else {
                // Near match — use ~ prefix
                var nearest = STANDARD_RATIOS.reduce(function(best, cur) {
                    return Math.abs(cur.decimal - r) < Math.abs(best.decimal - r) ? cur : best;
                });
                nearestLabel = nearest.label;
                if (Math.abs(nearest.decimal - r) < 0.1) {
                    pill = '~' + nearest.label;
                    isApprox = true;
                } else {
                    pill = '~' + r.toFixed(2).replace(/\.?0+$/, '') + ':1';
                    isApprox = true;
                }
            }
        }

        var orientation = getRatioOrientation(r);

        // Subtext: show resolution + code ratio only when approximating
        var subtext = '';
        if (isApprox && surface && surface.resolution && surface.resolution !== '—' && surface.resolution !== 'dynamic') {
            var codeRatio = (surface.ratioRaw || '').replace(/\*\*/g, '').trim();
            var explicitCode = codeRatio.match(/^~?(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)/);
            if (explicitCode && explicitCode[0] !== pill) {
                subtext = surface.resolution + ' · ' + explicitCode[0] + ' in code';
            } else {
                subtext = surface.resolution;
            }
        }

        return { pill: pill, orientation: orientation, subtext: subtext };
    }

    // Legacy string-only wrapper for callers that just need a label
    function formatRatio(r, surface) {
        return formatRatioInfo(r, surface).pill;
    }

    function parseResolutionWidth(resolution) {
        if (!resolution || resolution.toLowerCase() === 'dynamic') return null;
        // "160w × 240h" pattern
        var wMatch = resolution.match(/(\d+)w/);
        if (wMatch) return parseInt(wMatch[1]);
        // "~350×200pt", "768×432", "56×56pt", "164×246" — first number is width
        var dimMatch = resolution.match(/~?(\d+)\s*[×x]\s*\d+/);
        if (dimMatch) return parseInt(dimMatch[1]);
        return null;
    }

    function getTileWidth(surface) {
        var fd = (surface.fixedDim || '').toLowerCase();
        var fl = (surface.flexDim || '').toLowerCase();
        var res = surface.resolution || '';

        // --- Full-bleed: always full display width ---
        if (fd === 'width=full-bleed' || fl === 'width=full-bleed') {
            return 280;
        }

        // --- Breakpoint-snapped thumbnails (e.g. Cart web: 72–90px) ---
        var bpMatch = fl.match(/(\d+)[–\-](\d+)px.*breakpoint/i);
        if (bpMatch) {
            var bpSmall = parseInt(bpMatch[1]);
            var bpLarge = parseInt(bpMatch[2]);
            var displayLarge = 100;
            var displaySmall = Math.round((bpSmall / bpLarge) * displayLarge);
            return deviceWidth >= 768 ? displayLarge : displaySmall;
        }

        // --- Try to extract actual width from resolution string ---
        var actualW = parseResolutionWidth(res);
        if (actualW) {
            var ref = (surface.platform || '').toLowerCase().includes('web') ? 1440 : deviceWidth;
            var scaled = Math.round((actualW / ref) * 280);
            return Math.max(36, Math.min(280, scaled));
        }

        // --- Container-fill (fluid width, fixed height) without parseable width: full display width ---
        if ((fl === 'width=container' || fl.includes('container')) && fd.includes('h=')) {
            return 280;
        }

        // --- "dynamic" resolution with flexDim=both: medium carousel card ---
        // These are cards whose width scales with container but have no explicit px value.
        // Estimate ~40% of device width to distinguish from full-width cards.
        if (res.toLowerCase() === 'dynamic' && fl.startsWith('both')) {
            return Math.round(0.4 * 280);
        }

        // --- Flexible-range width (e.g. "300–680px") ---
        if (parseFlexRange(surface.flexDim)) {
            var maxRef = deviceWidth >= 500 ? 1440 : 430;
            return Math.min(280, Math.round((deviceWidth / maxRef) * 280));
        }

        return 280;
    }

    function getSizeContext(surface) {
        var fixed = (surface.fixedDim || '').toLowerCase();
        var flex = (surface.flexDim || '').toLowerCase();
        var res = (surface.resolution || '').toLowerCase();
        if (fixed === 'both') {
            var dim = res.match(/(\d+)/);
            var px = dim ? parseInt(dim[1]) : 0;
            if (px <= 72) return 'Tiny thumbnail';
            if (px <= 140) return 'Small card';
            if (px <= 200) return 'Medium card';
            return 'Fixed card';
        }
        if (fixed.includes('full-bleed') || flex.includes('full-bleed')) return 'Full-screen width';
        if (fixed.includes('h=') && flex.includes('container')) return 'Fixed height · fluid width';
        if (fixed.includes('h=') && flex.includes('300')) return 'Fixed height · fluid width';
        if (fixed.includes('h=')) return 'Fixed height strip';
        if (flex.includes('container') || flex.includes('width')) return 'Fills available space';
        return '';
    }

    function getDimSummary(surface) {
        const fixed = (surface.fixedDim || '').trim();
        const flex = (surface.flexDim || '').trim();
        const fixedLower = fixed.toLowerCase();
        const flexLower = flex.toLowerCase();

        if (fixedLower === 'both') {
            const dim = (surface.resolution || '').match(/(\d+)/);
            const px = dim ? parseInt(dim[1]) : 0;
            if (px <= 72) return 'Tiny · fixed size';
            if (px <= 164) return 'Small · fixed size';
            return 'Fixed size';
        }

        const parts = [];
        const hMatch = fixed.match(/h=(\d+(?:\/\d+)?)(px|pt)/i);
        if (hMatch) parts.push(hMatch[1] + hMatch[2] + ' tall');
        else if (fixedLower.includes('full-bleed') || fixedLower.includes('width=full')) parts.push('Full-width');

        if (flexLower.includes('container') || flexLower.includes('full-bleed')) {
            if (!parts.some(p => p.includes('Full-width'))) parts.push('width fluid');
        } else if (flexLower.includes('scroll-driven')) {
            parts.push('height adapts');
        } else if (flexLower.includes('carousel')) {
            parts.push('carousel sizing');
        } else if (flexLower.match(/\d+.*\d+/)) {
            parts.push('responsive');
        }

        return parts.join(' · ') || '';
    }

    function humanizeDimText(text) {
        if (!text) return text;
        return text
            .replace(/^h=(\d+)(px|pt)\s*\/\s*h=(\d+)(px|pt)/i, 'Height locked · $1$2 / $3$4')
            .replace(/^h=(\d+)(px|pt)/i, 'Height locked · $1$2')
            .replace(/^width=full-bleed/i, 'Full-width')
            .replace(/^width=2\/3\s*screen/i, 'Width: ⅔ screen')
            .replace(/^width=container/i, 'Width adapts')
            .replace(/height\s*\(scroll-driven\)/i, 'Height adapts')
            .replace(/both\s*\(carousel\)/i, 'Size adapts')
            .replace(/^both$/i, 'Size adapts')
            .replace(/(\d+)[–\-](\d+)(px|pt)\s*\(breakpoints?\)/i, '$1$3 mobile · $2$3 desktop')
            .replace(/^width\s+(\d+)[–\-](\d+)(px|pt)/i, 'Width: $1–$2$3');
    }

    function getDimChips(surface) {
        const chips = [];
        const fixed = (surface.fixedDim || '').trim();
        const flex = (surface.flexDim || '').trim();
        const fixedLower = fixed.toLowerCase();
        const flexLower = flex.toLowerCase();
        if (fixedLower === 'both') return [{ kind: 'fixed', text: 'Fixed size' }];
        if (fixed && fixed !== '—' && fixedLower !== 'both') {
            chips.push({ kind: 'fixed', text: humanizeDimText(fixed) });
        }
        if (flex && flex !== '—' && flexLower !== 'both') {
            chips.push({ kind: 'flex', text: humanizeDimText(flex) });
        }
        return chips;
    }

    /**
     * Renders semi-transparent safe-zone rectangle inside the tile.
     * Safe zones are defined on the SOURCE 3:2 frame; the visible portion
     * after crop maps as follows:
     *   - Conservative: 200px L/R + 120px T/B margins on 1200×800 source
     *   - Usable: 66px L/R + 60px T/B margins
     *   - 2:3 survival: 333px L/R margin (44.5% of source width preserved)
     *
     * For a target surface ratio R, the visible source width is min(1, R/sourceRatio)
     * of the source. The safe zone is drawn as % of the VISIBLE area.
     */
    function getSafeZoneOverlay(targetRatio) {
        const mode = safeZoneSelect ? safeZoneSelect.value : 'off';
        if (mode === 'off') return null;

        const sourceW = sourceWidth || 1200;
        const sourceH = sourceHeight || 800;

        // Visible portion of source after center crop
        const visibleWPx = targetRatio >= sourceRatio ? sourceW : sourceW * (targetRatio / sourceRatio);
        const visibleHPx = targetRatio >= sourceRatio ? sourceW / targetRatio : sourceH;
        const visibleLeftPx = (sourceW - visibleWPx) / 2;
        const visibleTopPx = (sourceH - visibleHPx) / 2;

        let safeLeft, safeRight, safeTop, safeBottom;
        var scaleX = sourceW / 1200;
        var scaleY = sourceH / 800;
        if (mode === 'conservative') {
            safeLeft = 200 * scaleX; safeRight = 1000 * scaleX; safeTop = 120 * scaleY; safeBottom = 680 * scaleY;
        } else if (mode === 'usable') {
            safeLeft = 66 * scaleX; safeRight = 1134 * scaleX; safeTop = 60 * scaleY; safeBottom = 740 * scaleY;
        } else if (mode === 'survival') {
            safeLeft = 333 * scaleX; safeRight = 867 * scaleX; safeTop = 0; safeBottom = sourceH;
        } else {
            return null;
        }

        // Map safe zone (in source coords) to visible-area coords as %.
        // If safe zone is entirely outside the visible window, the overlay clips.
        const overlayLeft = Math.max(0, ((safeLeft - visibleLeftPx) / visibleWPx) * 100);
        const overlayRight = Math.min(100, ((safeRight - visibleLeftPx) / visibleWPx) * 100);
        const overlayTop = Math.max(0, ((safeTop - visibleTopPx) / visibleHPx) * 100);
        const overlayBottom = Math.min(100, ((safeBottom - visibleTopPx) / visibleHPx) * 100);

        if (overlayRight <= overlayLeft || overlayBottom <= overlayTop) return null;

        return {
            left: overlayLeft,
            top: overlayTop,
            width: overlayRight - overlayLeft,
            height: overlayBottom - overlayTop,
            mode
        };
    }

    function openDetailModal(surface) {
        const displayRatio = getDisplayRatio(surface);
        const pct = widthVisiblePct(displayRatio);
        const severity = lossSeverity(pct);
        const chips = getDimChips(surface);
        const platformLabel = getPlatformBadges(surface.platform);
        const ratioClean = surface.ratioRaw.replace(/\*\*/g, '').replace(/\s*(portrait|landscape|wide)\s*/gi, '').trim();
        const portrait = isPortrait(displayRatio);
        const imgSrc = imageUrl || DEMO_IMAGE;

        // Build dynamic source ratio label
        var sourceRatioLabel = '3:2';
        for (var k = 0; k < STANDARD_RATIOS.length; k++) {
            if (Math.abs(sourceRatio - STANDARD_RATIOS[k].decimal) < 0.03) {
                sourceRatioLabel = STANDARD_RATIOS[k].label;
                break;
            }
        }
        if (sourceRatioLabel === '3:2' && Math.abs(sourceRatio - DEFAULT_SOURCE_RATIO) >= 0.03) {
            sourceRatioLabel = sourceRatio.toFixed(2) + ':1';
        }

        // Safe zone explanation for this surface
        const safeZoneNotes = [];
        const hPct = heightVisiblePct(displayRatio);
        if (portrait) {
            safeZoneNotes.push('⚠️ Portrait surface: a ' + sourceRatioLabel + ' source loses <strong>' + (100 - pct) + '% of its width</strong> in a center crop. Only the central ' + pct + '% of width survives.');
            safeZoneNotes.push('To guarantee subject visibility, all key content must fall within the central <strong>' + Math.round((sourceWidth || 1200) * (displayRatio / sourceRatio)) + 'px</strong> of the ' + (sourceWidth || 1200) + 'px source width.');
            safeZoneNotes.push('The Conservative (800px usable) and Usable (1068px) safe zones both extend well beyond this limit — neither protects content from a portrait crop.');
        } else if (hPct < 100) {
            safeZoneNotes.push('⚠️ Wide surface: full source width is visible, but only <strong>' + hPct + '% of height</strong> survives a center crop. Content near the top or bottom of the frame will be clipped.');
        } else if (pct < 100) {
            safeZoneNotes.push('Some horizontal cropping occurs (' + pct + '% width visible). Subject should be centred.');
        } else {
            safeZoneNotes.push('Full source is visible — this surface exactly matches the ' + sourceRatioLabel + ' source ratio.');
        }

        const range = parseFlexRange(surface.flexDim);
        const rangeHtml = range ? range.min + range.unit + ' – ' + range.max + range.unit : null;

        const fixedFlexHtml = chips.length > 0
            ? chips.map(c => '<span class="dim-chip dim-chip-' + c.kind + '">' + c.text + '</span>').join(' ')
            : '<span class="detail-value">Both dimensions fixed</span>';

        const labelsHtml = surface.hasLabel
            ? '<span class="detail-value">' + surface.labelPosition + '</span><p class="detail-note">UI elements overlay this area. Avoid placing critical subject content here.</p>'
            : '<span class="detail-value muted">None</span>';

        const sourceHtml = surface.source && surface.source !== 'TBD' && surface.source !== '—'
            ? '<code class="detail-source">' + surface.source + '</code>'
            : '<span class="detail-value muted">TBD — code location not pinned</span>';

        const journeyHtml = surface.journey && surface.journey !== '—'
            ? '<span class="badge-journey">' + surface.journey + '</span>'
            : '<span class="detail-value muted">—</span>';

        detailContent.innerHTML = `
            <div class="detail-header">
                <div class="detail-preview-col">
                    <div class="detail-image-container" style="padding-bottom:${(1 / displayRatio * 100)}%">
                        <img src="${imgSrc}" alt="${surface.name}">
                        ${surface.hasLabel && surface.labelPosition !== '—' ? renderLabelSlotsHtml(surface.labelPosition) : ''}
                        <div class="loss-badge loss-${severity} loss-badge--split">${cropLossText(pct, hPct).split(' · ').map((p,i) => i===0 ? '<span class="loss-badge-visible">'+p+'</span>' : '<span class="loss-badge-dir">'+p+'</span>').join('')}</div>
                    </div>
                    <p class="detail-ratio-label">${ratioClean} <span class="detail-orientation">${getRatioOrientation(displayRatio)}</span></p>
                </div>
                <div class="detail-title-col">
                    <h2 class="detail-name">${surface.name}</h2>
                    <p class="detail-platform">${platformLabel}</p>
                </div>
            </div>

            <div class="detail-grid">
                <div class="detail-section">
                    <h3>Dimensions</h3>
                    <dl>
                        <dt>Aspect ratio</dt><dd>${ratioClean}</dd>
                        <dt>Resolution</dt><dd>${surface.resolution}</dd>
                        <dt>Fixed dimension</dt><dd>${fixedFlexHtml}</dd>
                        ${chips.length > 0 ? '<dt>Flexible dimension</dt><dd>' + chips.filter(c => c.kind === 'flex').map(c => c.text).join(', ') + '</dd>' : ''}
                        ${rangeHtml ? '<dt>Width range</dt><dd class="spec-range">' + rangeHtml + '</dd>' : ''}
                    </dl>
                </div>

                <div class="detail-section">
                    <h3>Crop behaviour</h3>
                    <dl>
                        <dt>Crop mode</dt><dd>Center crop — edges clipped, never stretched</dd>
                        ${hPct < 100
                            ? '<dt>Top & bottom cropped</dt><dd><span class="loss-badge-inline loss-' + lossSeverity(hPct) + '">' + (100 - hPct) + '%</span></dd><dt>Height retained</dt><dd>' + hPct + '%</dd>'
                            : '<dt>Sides cropped</dt><dd><span class="loss-badge-inline loss-' + severity + '">' + (100 - pct) + '%</span></dd><dt>Width retained</dt><dd>' + pct + '%</dd>'
                        }
                    </dl>
                </div>

                <div class="detail-section detail-section-full">
                    <h3>Safe zone</h3>
                    ${safeZoneNotes.map(n => '<p class="detail-note">' + n + '</p>').join('')}
                    <dl>
                        <dt>Conservative zone</dt><dd>800×560px usable on 1200×800 source (200px L/R, 120px T/B margins)</dd>
                        <dt>Usable zone</dt><dd>1068×680px usable (66px L/R, 60px T/B margins)</dd>
                        <dt>2:3 survival zone</dt><dd>534px centered — only zone that survives portrait crop (333px L/R margin)</dd>
                    </dl>
                </div>

                <div class="detail-section">
                    <h3>UI labels / overlays</h3>
                    ${labelsHtml}
                </div>

                <div class="detail-section">
                    <h3>User journey</h3>
                    ${journeyHtml}
                </div>

                <div class="detail-section detail-section-full">
                    <h3>Code source</h3>
                    ${sourceHtml}
                </div>

                <div class="detail-section detail-section-full">
                    <h3>Composition guidance</h3>
                    <ul class="detail-checklist">
                        ${portrait ? '<li class="checklist-warn">This is a <strong>portrait crop</strong> — only the centre ' + pct + '% of your source width will be visible. Keep the hero subject, faces, and key ingredients within the centre third of the frame. Anything near the left or right edge will be cut.</li>' : ''}
                        ${hPct < 100 ? '<li class="checklist-warn">This is a <strong>wide crop</strong> — ' + (100-hPct) + '% of the top and bottom will be cut. Garnishes on the plate edge, hands, and table surface may disappear. Keep key visual elements in the vertical centre.</li>' : ''}
                        ${chips.some(c => c.kind === 'flex') ? '<li class="checklist-warn">This surface <strong>changes width across devices</strong>. Compose for the most cropped state — avoid edge-anchored elements like props at the sides of the frame.</li>' : ''}
                        ${surface.hasLabel ? '<li class="checklist-info">App labels appear at: <strong>' + surface.labelPosition + '</strong>. Leave those areas clear of faces, logos, or important plating details.</li>' : ''}
                        <li>Crop is always centred — the middle of your photo is always preserved. Only the outer edges are removed.</li>
                        <li>Deliver at minimum 1200×800px, 3:2, sRGB, JPG.</li>
                    </ul>
                </div>
            </div>
        `;

        detailOverlay.classList.remove('hidden');
    }

    function renderLabelSlotsHtml(labelPosition) {
        const pos = labelPosition.toLowerCase();
        let html = '';
        if (pos.includes('top-right')) html += '<div class="label-slot top-right"></div>';
        if (pos.includes('top-left')) html += '<div class="label-slot top-left"></div>';
        if (pos.includes('bottom-left')) html += '<div class="label-slot bottom-left"></div>';
        if (pos.includes('bottom-right')) html += '<div class="label-slot bottom-right"></div>';
        return html;
    }

    function closeDetailModal() {
        detailOverlay.classList.add('hidden');
    }

    detailClose.addEventListener('click', closeDetailModal);
    detailOverlay.addEventListener('click', function (e) {
        if (e.target === detailOverlay) closeDetailModal();
    });

    function renderTiles() {
        if (surfaces.length === 0) return;

        const showLabels = showLabelsCheckbox.checked;
        tilesContainer.innerHTML = '';

        const filtered = sortByPriority(applyFilter(surfaces));

        filtered.forEach(surface => {
            const tile = document.createElement('div');
            tile.className = 'tile';

            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'tile-image-wrapper';
            imageWrapper.style.width = getTileWidth(surface) + 'px';

            const displayRatio = getDisplayRatio(surface);
            const imgContainer = document.createElement('div');
            imgContainer.className = 'tile-image-container';
            imgContainer.style.paddingBottom = (1 / displayRatio * 100) + '%';

            const img = document.createElement('img');
            img.src = imageUrl || DEMO_IMAGE;
            img.alt = surface.name;
            imgContainer.appendChild(img);

            // Safe-zone overlay (Conservative / Usable / 2:3 survival)
            const overlay = getSafeZoneOverlay(displayRatio);
            if (overlay) {
                const safeRect = document.createElement('div');
                safeRect.className = 'safe-zone-overlay sz-' + overlay.mode;
                safeRect.style.left = overlay.left + '%';
                safeRect.style.top = overlay.top + '%';
                safeRect.style.width = overlay.width + '%';
                safeRect.style.height = overlay.height + '%';
                imgContainer.appendChild(safeRect);
            }

            if (showLabels && surface.hasLabel && surface.labelPosition !== '—') {
                const positions = surface.labelPosition.toLowerCase();
                if (positions.includes('top-right')) imgContainer.appendChild(createLabelSlot('top-right', 'Label'));
                if (positions.includes('top-left')) imgContainer.appendChild(createLabelSlot('top-left', 'Badge'));
                if (positions.includes('bottom-left')) imgContainer.appendChild(createLabelSlot('bottom-left', 'Tag'));
                if (positions.includes('bottom-right')) imgContainer.appendChild(createLabelSlot('bottom-right', 'Pill'));
            }

            imageWrapper.appendChild(imgContainer);

            const pct = widthVisiblePct(displayRatio);
            const hPctTile = heightVisiblePct(displayRatio);
            const meta = document.createElement('div');
            meta.className = 'tile-meta';

            const ratioInfo = formatRatioInfo(displayRatio, surface);
            const dimSummary = getDimSummary(surface);
            const truncName = surface.name.length > 72 ? surface.name.slice(0, 72) + '…' : surface.name;
            const lossSev = lossSeverity(hPctTile < 100 ? hPctTile : pct);
            const lossBadge = cropLossBadgeHtml(pct, hPctTile, 'loss-' + lossSev);
            meta.innerHTML = `
                <div class="tile-primary">
                    <span class="tile-name">${truncName}</span>
                    ${lossBadge}
                </div>
                <div class="tile-secondary">
                    <span class="tile-ratio-pill">${ratioInfo.pill}</span>
                    ${dimSummary ? '<span class="tile-dim-summary">' + dimSummary + '</span>' : ''}
                </div>
                <div class="tile-tertiary">
                    ${getPlatformBadges(surface.platform)}
                </div>
            `;

            tile.style.cursor = 'pointer';
            tile.addEventListener('click', function () { openDetailModal(surface); });

            tile.appendChild(imageWrapper);
            tile.appendChild(meta);
            tilesContainer.appendChild(tile);
        });
    }

    function createLabelSlot(position, text) {
        const slot = document.createElement('div');
        slot.className = 'label-slot ' + position;
        slot.textContent = text;
        return slot;
    }

    function renderEmptyState() {
        if (surfaces.length === 0) return;
        const container = document.getElementById('empty-tiles');
        const countEl = document.getElementById('surface-count');
        if (!container) return;

        const filtered = sortByPriority(applyFilter(surfaces));
        const showLabels = showLabelsCheckbox ? showLabelsCheckbox.checked : true;

        countEl.textContent = filtered.length;

        var headingEl = document.querySelector('.empty-heading');
        if (headingEl) {
            var ratioLabel = '3:2';
            if (sourceWidth && sourceHeight) {
                for (var i = 0; i < STANDARD_RATIOS.length; i++) {
                    if (Math.abs(sourceRatio - STANDARD_RATIOS[i].decimal) < 0.03) {
                        ratioLabel = STANDARD_RATIOS[i].label;
                        break;
                    }
                }
                if (ratioLabel === '3:2' && Math.abs(sourceRatio - DEFAULT_SOURCE_RATIO) >= 0.03) {
                    ratioLabel = sourceRatio.toFixed(2) + ':1';
                }
            }
            var suffix = imageUrl ? '' : ' Upload a photo to see the impact.';
            headingEl.innerHTML = 'Your <strong>' + ratioLabel + '</strong> source ships at <strong id="surface-count">' + filtered.length + '</strong> different crop shapes.' + suffix;
        }

        container.innerHTML = '';

        filtered.forEach(surface => {
            const card = document.createElement('div');
            card.className = 'empty-card';

            const tileW = getTileWidth(surface);

            const displayRatioG = getDisplayRatio(surface);
            const shape = document.createElement('div');
            shape.className = 'empty-shape';
            shape.style.width = tileW + 'px';
            shape.style.aspectRatio = displayRatioG;

            const img = document.createElement('img');
            img.src = imageUrl || DEMO_IMAGE;
            img.alt = surface.name;
            shape.appendChild(img);

            // Safe-zone overlay
            const overlay = getSafeZoneOverlay(displayRatioG);
            if (overlay) {
                const safeRect = document.createElement('div');
                safeRect.className = 'safe-zone-overlay sz-' + overlay.mode;
                safeRect.style.left = overlay.left + '%';
                safeRect.style.top = overlay.top + '%';
                safeRect.style.width = overlay.width + '%';
                safeRect.style.height = overlay.height + '%';
                shape.appendChild(safeRect);
            }

            const pct = widthVisiblePct(displayRatioG);
            const hPctGrid = heightVisiblePct(displayRatioG);
            const lossSevG = lossSeverity(hPctGrid < 100 ? hPctGrid : pct);
            const lossTextG = cropLossText(pct, hPctGrid);

            if (lossTextG !== 'Full frame') {
                const lossBadgeEl = document.createElement('span');
                lossBadgeEl.className = 'card-loss card-loss--' + lossSevG;
                lossBadgeEl.textContent = lossTextG.split(' · ')[0];
                shape.appendChild(lossBadgeEl);
            }

            const label = document.createElement('div');
            label.className = 'empty-label';

            const truncName = surface.name.length > 72 ? surface.name.slice(0, 72) + '…' : surface.name;
            const ratioInfoG = formatRatioInfo(displayRatioG, surface);
            label.innerHTML = '<span class="card-name">' + truncName
                + '</span><span class="card-ratio-pill">' + ratioInfoG.pill + '</span>';

            card.appendChild(shape);
            card.appendChild(label);

            card.style.cursor = 'pointer';
            card.addEventListener('click', function () { openDetailModal(surface); });

            container.appendChild(card);
        });
    }

    function renderSpecsTable() {
        const container = document.getElementById('specs-table');
        if (!container || surfaces.length === 0) return;

        const filterToUse = specsFilter || activeFilter;
        const filtered = sortByPriority(surfaces.filter(function (s) {
            if (filterToUse === 'all') return true;
            if (filterToUse === 'portrait') return isPortrait(s.ratio);
            return s.platform.split('/').some(function (p) { return getPlatformKey(p.trim().toLowerCase()) === filterToUse; });
        }));

        let html = '<table class="specs"><thead><tr>';
        html += '<th>Preview</th>';
        html += '<th>Placement</th>';
        html += '<th>Platform</th>';
        html += '<th>Journey</th>';
        html += '<th>Aspect Ratio</th>';
        html += '<th>Width visible</th>';
        html += '<th>Fixed dimension</th>';
        html += '<th>Flexible dimension</th>';
        html += '<th>Ratio range</th>';
        html += '<th>Supported Sizes</th>';
        html += '<th>Crop Mode</th>';
        html += '<th>Labels / Notes</th>';
        html += '</tr></thead><tbody>';

        filtered.forEach(surface => {
            const ratioClean = surface.ratioRaw.replace(/\*\*/g, '').replace(/\s*(portrait|landscape|wide)\s*/gi, '').trim();
            const labelInfo = surface.hasLabel ? surface.labelPosition : '—';
            const notes = [];
            if (ratioClean.toLowerCase().includes('dynamic') || ratioClean.toLowerCase().includes('fluid') || ratioClean.toLowerCase().includes('variable')) {
                notes.push('Dynamic sizing');
            }
            const specDisplayRatio = getDisplayRatio(surface);
            if (isPortrait(specDisplayRatio)) {
                notes.push('Portrait');
            }
            const noteStr = notes.length > 0 ? notes.join(', ') : '';
            const labelAndNotes = [labelInfo, noteStr].filter(Boolean).join(' · ');

            const pct = widthVisiblePct(specDisplayRatio);
            const hPctSpec = heightVisiblePct(specDisplayRatio);
            const lossClass = 'loss-' + lossSeverity(hPctSpec < 100 ? hPctSpec : pct);

            const priority = surface.priority || '—';
            const priorityClass = priority !== '—' ? 'badge-' + priority.toLowerCase() : '';
            const journey = surface.journey || '—';

            html += '<tr>';
            html += '<td class="spec-preview-cell"><div class="spec-preview" style="padding-bottom:' + (1 / specDisplayRatio * 100) + '%"><img src="' + (imageUrl || DEMO_IMAGE) + '" alt=""></div></td>';
            html += '<td class="spec-name">' + surface.name + '</td>';
            html += '<td>' + getPlatformBadges(surface.platform) + '</td>';
            html += '<td>' + journey + '</td>';
            html += '<td>' + ratioClean + '</td>';
            html += '<td>' + cropLossBadgeHtml(pct, hPctSpec, lossClass) + '</td>';
            const chips = getDimChips(surface);
            const fixedChips = chips.filter(c => c.kind === 'fixed');
            const flexChips  = chips.filter(c => c.kind === 'flex');
            const fixedHtml = fixedChips.length
                ? fixedChips.map(c => '<span class="dim-chip dim-chip-fixed">' + c.text + '</span>').join(' ')
                : '<span style="color:var(--color-foreground-secondary);font-size:0.7rem">—</span>';
            const flexHtml = flexChips.length
                ? flexChips.map(c => '<span class="dim-chip dim-chip-flex">' + c.text + '</span>').join(' ')
                : '<span style="color:var(--color-foreground-secondary);font-size:0.7rem">—</span>';
            html += '<td>' + fixedHtml + '</td>';
            html += '<td>' + flexHtml + '</td>';
            var ratioRange = computeRatioRange(surface);
            var ratioRangeText = ratioRange
                ? (ratioRange.single ? formatRatio(ratioRange.min, surface) : formatRatio(ratioRange.min, surface) + ' – ' + formatRatio(ratioRange.max, surface))
                : '—';
            html += '<td class="spec-range">' + ratioRangeText + '</td>';
            html += '<td>' + surface.resolution + '</td>';
            html += '<td>Center crop</td>';
            html += '<td>' + labelAndNotes + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function applySimView() {
        const viewToggle = document.getElementById('view-toggle');
        if (viewToggle) {
            viewToggle.querySelectorAll('.view-toggle-btn').forEach(function (btn) {
                btn.classList.toggle('active', btn.dataset.view === simView);
            });
        }
        if (simView === 'list') {
            gallery.classList.remove('hidden');
            emptyState.classList.add('hidden');
        } else {
            emptyState.classList.remove('hidden');
            gallery.classList.add('hidden');
        }
    }

    function handleImage(file) {
        if (!file || !file.type.startsWith('image/')) return;

        closeModal();

        const reader = new FileReader();
        reader.onload = function (e) {
            imageUrl = e.target.result;

            var probe = new Image();
            probe.onload = function () {
                sourceWidth = probe.naturalWidth;
                sourceHeight = probe.naturalHeight;
                sourceRatio = (sourceWidth > 0 && sourceHeight > 0)
                    ? sourceWidth / sourceHeight
                    : DEFAULT_SOURCE_RATIO;
                onImageReady();
            };
            probe.onerror = function () {
                sourceWidth = null;
                sourceHeight = null;
                sourceRatio = DEFAULT_SOURCE_RATIO;
                onImageReady();
            };
            probe.src = imageUrl;
        };
        reader.readAsDataURL(file);
    }

    function onImageReady() {
        controls.classList.remove('hidden');
        updateSourceIndicator();
        applySimView();
        renderTiles();
        renderEmptyState();
        renderSpecsTable();
        updateContextImages();
    }

    function updateSourceIndicator() {
        var ids = ['source-indicator-global'];

        if (!sourceWidth || !sourceHeight || !imageUrl) {
            ids.forEach(function (id) {
                var el = document.getElementById(id);
                if (!el) return;
                el.classList.remove('hidden');
                el.classList.add('source-indicator--default');
                el.innerHTML = '<span class="source-indicator-ratio">3:2</span>'
                    + '<span class="source-indicator-dims">1200×800</span>'
                    + '<span class="source-indicator-orientation">LANDSCAPE</span>'
                    + '<span class="source-indicator-default-tag">default</span>';
            });
            return;
        }

        var ratioLabel = '';
        for (var i = 0; i < STANDARD_RATIOS.length; i++) {
            if (Math.abs(sourceRatio - STANDARD_RATIOS[i].decimal) < 0.03) {
                ratioLabel = STANDARD_RATIOS[i].label;
                break;
            }
        }
        if (!ratioLabel) {
            ratioLabel = sourceRatio.toFixed(2) + ':1';
        }

        var orientation = getRatioOrientation(sourceRatio);
        var isNotDefault = Math.abs(sourceRatio - DEFAULT_SOURCE_RATIO) >= 0.03;

        function clearPhoto() {
            imageUrl = '';
            sourceWidth = null;
            sourceHeight = null;
            sourceRatio = DEFAULT_SOURCE_RATIO;
            updateSourceIndicator();
            applySimView();
            renderTiles();
            renderEmptyState();
            renderSpecsTable();
            updateContextImages();
        }

        ids.forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('source-indicator--default');

            var html = '<img class="source-indicator-thumb" src="' + imageUrl + '" alt="Source photo">';
            html += '<span class="source-indicator-ratio">' + ratioLabel + '</span>';
            html += '<span class="source-indicator-dims">' + sourceWidth + '×' + sourceHeight + '</span>';
            html += '<span class="source-indicator-orientation">' + orientation + '</span>';

            if (isNotDefault) {
                html += '<span class="source-indicator-warning" title="Recommended shooting format is 3:2. Loss values adjusted to your actual source.">Not 3:2</span>';
            }

            html += '<button class="source-indicator-close" title="Remove photo">×</button>';

            el.innerHTML = html;
            el.classList.remove('hidden');

            el.querySelector('.source-indicator-close').onclick = clearPhoto;
        });
    }

    function openModal() {
        modalOverlay.classList.remove('hidden');
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
    }

    // View toggle (grid / list)
    const viewToggleEl = document.getElementById('view-toggle');
    if (viewToggleEl) {
        viewToggleEl.addEventListener('click', function (e) {
            const btn = e.target.closest('.view-toggle-btn');
            if (!btn) return;
            simView = btn.dataset.view;
            applySimView();
        });
    }

    // Modal events
    uploadBtn.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) closeModal();
    });

    // Drag and drop
    dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', function () {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleImage(e.dataTransfer.files[0]);
    });

    // File input
    fileInput.addEventListener('change', function () {
        handleImage(fileInput.files[0]);
    });

    // Tab filter
    platformTabs.addEventListener('click', function (e) {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        platformTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        renderDeviceChips(activeFilter);
        if (imageUrl) {
            renderTiles();
        } else {
            renderEmptyState();
            renderSpecsTable();
        }
    });

    // Controls — re-render whatever is currently visible (empty state OR uploaded gallery)
    function rerenderActive() {
        if (imageUrl) {
            renderTiles();
        } else {
            renderEmptyState();
        }
        renderSpecsTable();
    }
    showLabelsCheckbox.addEventListener('change', rerenderActive);
    safeZoneSelect.addEventListener('change', rerenderActive);

    // Keyboard shortcut
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
            closeDetailModal();
        }
    });

    // Main navigation
    mainNav.addEventListener('click', function (e) {
        var tab = e.target.closest('.nav-tab');
        if (!tab) return;
        mainNav.querySelectorAll('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var view = tab.dataset.view;
        viewSimulator.classList.toggle('hidden', view !== 'simulator');
        viewSpecs.classList.toggle('hidden', view !== 'specs');
        viewContext.classList.toggle('hidden', view !== 'context');
        if (viewRecommendation) viewRecommendation.classList.toggle('hidden', view !== 'recommendation');
        if (view === 'context') updateContextImages();
        if (view === 'specs') renderSpecsTable();
        if (view === 'recommendation') renderRecommendation();
    });

    // Specs view filter tabs
    if (specsTabs) {
        specsTabs.addEventListener('click', function (e) {
            var tab = e.target.closest('.tab');
            if (!tab) return;
            specsTabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            specsFilter = tab.dataset.filter;
            renderSpecsTable();
        });
    }

    const deviceSelector = document.getElementById('device-sub-bar');
    const deviceChipsContainer = document.getElementById('device-chips');
    const deviceCustomInput = document.getElementById('device-custom-input');
    const specsDeviceIndicator = document.getElementById('specs-device-indicator');

    function setDeviceWidth(w) {
        deviceWidth = w;
        var unit = w >= 500 ? 'px' : 'pt';
        if (specsDeviceIndicator) specsDeviceIndicator.textContent = '@ ' + w + unit;
        renderEmptyState();
        renderTiles();
        renderSpecsTable();
    }

    function renderDeviceChips(platformFilter) {
        var subBar = document.getElementById('device-sub-bar');
        if (subBar) subBar.classList.toggle('hidden', platformFilter === 'all');
        if (!deviceChipsContainer) return;
        var presets = DEVICE_PRESETS[platformFilter] || DEVICE_PRESETS['all'];
        var defaultWidth = PRESET_DEFAULT_WIDTH[platformFilter] || 390;

        // If current deviceWidth isn't in the new preset list, reset to default
        var widths = presets.filter(p => p.width !== 'custom').map(p => p.width);
        var useWidth = widths.includes(deviceWidth) ? deviceWidth : defaultWidth;

        deviceChipsContainer.innerHTML = '';
        presets.forEach(function (preset) {
            var btn = document.createElement('button');
            btn.className = 'device-chip';
            btn.dataset.width = preset.width;
            btn.textContent = preset.label;
            if (preset.width === useWidth) btn.classList.add('active');
            deviceChipsContainer.appendChild(btn);
        });

        if (deviceCustomInput) deviceCustomInput.classList.add('hidden');
        if (useWidth !== deviceWidth) setDeviceWidth(useWidth);
    }

    if (deviceSelector) {
        deviceSelector.addEventListener('click', function (e) {
            var chip = e.target.closest('.device-chip');
            if (!chip) return;
            deviceSelector.querySelectorAll('.device-chip').forEach(function (c) { c.classList.remove('active'); });
            chip.classList.add('active');
            if (chip.dataset.width === 'custom') {
                deviceCustomInput.classList.remove('hidden');
                deviceCustomInput.focus();
            } else {
                deviceCustomInput.classList.add('hidden');
                setDeviceWidth(parseInt(chip.dataset.width));
            }
        });
        if (deviceCustomInput) {
            deviceCustomInput.addEventListener('change', function () {
                var v = parseInt(deviceCustomInput.value);
                if (!isNaN(v) && v >= 280 && v <= 2560) setDeviceWidth(v);
            });
        }
    }

    // Initial chip render
    renderDeviceChips('all');

    function updateContextImages() {
        var src = imageUrl || DEMO_IMAGE;
        var imgs = viewContext.querySelectorAll('.context-img');
        imgs.forEach(function (img) { img.src = src; });
    }

    // Load surfaces
    fetch(SURFACES_PATH)
        .then(r => r.text())
        .then(md => {
            surfaces = parseSurfacesTable(md);
            updateSourceIndicator();
            applySimView();
            renderEmptyState();
            renderTiles();
            renderSpecsTable();
            updateContextImages();
        })
        .catch(() => {
            surfaces = getFallbackSurfaces();
            updateSourceIndicator();
            applySimView();
            renderEmptyState();
            renderTiles();
            renderSpecsTable();
            updateContextImages();
        });

    function getFallbackSurfaces() {
        return [
            { name: 'My Menu — recipe card (normal)', platform: 'web', ratioRaw: '16:9', ratio: 16/9, resolution: '768×432', hasLabel: true, labelPosition: 'Top-right', source: '' },
            { name: 'My Menu — recipe card (large)', platform: 'web', ratioRaw: '3:2', ratio: 3/2, resolution: '1152×768', hasLabel: true, labelPosition: 'Top-right', source: '' },
            { name: 'Store / Past Orders — recipe card', platform: 'web', ratioRaw: 'Dynamic', ratio: 16/9, resolution: 'h=202px', hasLabel: true, labelPosition: 'Top-right + bottom-left', source: '' },
            { name: 'Cart — recipe thumbnail', platform: 'web', ratioRaw: '1:1', ratio: 1, resolution: '72×72', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Product Detail', platform: 'web', ratioRaw: '~2.4:1', ratio: 2.4, resolution: '1200×500', hasLabel: true, labelPosition: 'Top-right', source: '' },
            { name: 'Home — Order Management Card', platform: 'ios', ratioRaw: '1:1', ratio: 1, resolution: 'dynamic', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Home — Recipe List Card', platform: 'ios', ratioRaw: '1:1', ratio: 1, resolution: '68×68pt', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Weekly Menu — recipe card', platform: 'ios', ratioRaw: '~1.75:1', ratio: 1.75, resolution: '~350×200pt', hasLabel: true, labelPosition: 'Top-right + bottom-left', source: '' },
            { name: 'Cart — recipe thumbnail', platform: 'ios', ratioRaw: '1:1', ratio: 1, resolution: '56×56pt', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Recipe Detail — parallax', platform: 'ios', ratioRaw: 'Variable', ratio: 16/9, resolution: 'min 220pt', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Past Orders Rating — v2', platform: 'ios', ratioRaw: '2:3 portrait', ratio: 2/3, resolution: 'floor(2/3 screen)', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Add-on / Food Item Carousel', platform: 'ios', ratioRaw: '~5:7', ratio: 5/7, resolution: 'scales with carousel', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Cookbook — Meals from your box', platform: 'mobile (rn)', ratioRaw: '2:3 portrait', ratio: 2/3, resolution: '160×240', hasLabel: true, labelPosition: 'Bottom-right', source: '' },
            { name: 'Cookbook — Collections grid', platform: 'mobile (rn)', ratioRaw: '1:1', ratio: 1, resolution: '163×163', hasLabel: true, labelPosition: 'Bottom-left', source: '' },
            { name: 'Cookbook — Recently Saved', platform: 'mobile (rn)', ratioRaw: '3:2', ratio: 3/2, resolution: '160×107', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Cookbook — Collection card header', platform: 'mobile (rn)', ratioRaw: '2:1', ratio: 2, resolution: 'full width', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Discover Hub — carousel card', platform: 'mobile (rn)', ratioRaw: '2:3 portrait', ratio: 2/3, resolution: '164×246', hasLabel: true, labelPosition: 'Top-right', source: '' },
            { name: 'Discover Hub — recommendation', platform: 'mobile (rn)', ratioRaw: 'Portrait (variable)', ratio: 2/3, resolution: '300h / 450h', hasLabel: true, labelPosition: 'Bottom', source: '' },
            { name: 'Recipe Hub — sections', platform: 'mobile (rn)', ratioRaw: '1.56:1', ratio: 1.56, resolution: '200×128', hasLabel: false, labelPosition: '—', source: '' },
            { name: 'Mobile Menu — preselected (large)', platform: 'mobile (rn)', ratioRaw: 'Dynamic × 202h', ratio: 16/9, resolution: 'h=202', hasLabel: true, labelPosition: 'Top-left + bottom-right', source: '' },
            { name: 'Mobile Menu — preselected (small)', platform: 'mobile (rn)', ratioRaw: '1:1', ratio: 1, resolution: '140×140', hasLabel: true, labelPosition: 'Top-left', source: '' },
            { name: 'Mobile Menu — favourites carousel', platform: 'mobile (rn)', ratioRaw: 'Fluid × 240h', ratio: 4/3, resolution: 'h=240', hasLabel: true, labelPosition: 'Top-right', source: '' },
            { name: 'Mobile Menu — hub card (small)', platform: 'mobile (rn)', ratioRaw: '1:1', ratio: 1, resolution: '140×140', hasLabel: true, labelPosition: 'Top-right', source: '' },
            { name: 'Mobile Menu — past delivery', platform: 'mobile (rn)', ratioRaw: 'Fluid × 240h', ratio: 4/3, resolution: 'h=240', hasLabel: true, labelPosition: 'Top-left', source: '' },
        ];
    }

    // === RECOMMENDATION TAB ===

    var CANDIDATE_FORMATS = [
        { ratio: 3/2, label: '3:2' },
        { ratio: 2/3, label: '2:3' },
        { ratio: 1/1, label: '1:1' },
        { ratio: 16/9, label: '16:9' },
        { ratio: 4/3, label: '4:3' },
        { ratio: 5/3, label: '5:3' },
    ];

    function cropLossForPair(sourceRatio, targetRatio) {
        if (targetRatio >= sourceRatio) {
            return 100 - Math.round((sourceRatio / targetRatio) * 100);
        }
        return 100 - Math.round((targetRatio / sourceRatio) * 100);
    }

    function bestFormatForSurface(surfaceRatio, formats) {
        var best = null;
        var bestLoss = 100;
        for (var i = 0; i < formats.length; i++) {
            var loss = cropLossForPair(formats[i].ratio, surfaceRatio);
            if (loss < bestLoss) {
                bestLoss = loss;
                best = formats[i];
            }
        }
        return { format: best, loss: bestLoss };
    }

    function computeRecommendation(formatCount) {
        var p0 = surfaces.filter(function(s) { return (s.priority || '').toLowerCase() === 'p0'; });
        if (p0.length === 0) p0 = surfaces;

        if (formatCount === 1) {
            var results = CANDIDATE_FORMATS.map(function(fmt) {
                var maxLoss = 0;
                var avgLoss = 0;
                var assignments = p0.map(function(s) {
                    var r = getDisplayRatio(s);
                    var loss = cropLossForPair(fmt.ratio, r);
                    if (loss > maxLoss) maxLoss = loss;
                    avgLoss += loss;
                    return { surface: s, format: fmt, loss: loss };
                });
                return { formats: [fmt], maxLoss: maxLoss, avgLoss: avgLoss / p0.length, assignments: assignments };
            });
            results.sort(function(a, b) { return a.avgLoss - b.avgLoss; });
            return results[0];
        }

        var bestResult = null;
        for (var i = 0; i < CANDIDATE_FORMATS.length; i++) {
            for (var j = i + 1; j < CANDIDATE_FORMATS.length; j++) {
                var pair = [CANDIDATE_FORMATS[i], CANDIDATE_FORMATS[j]];
                var maxLoss = 0;
                var avgLoss = 0;
                var assignments = p0.map(function(s) {
                    var r = getDisplayRatio(s);
                    var pick = bestFormatForSurface(r, pair);
                    if (pick.loss > maxLoss) maxLoss = pick.loss;
                    avgLoss += pick.loss;
                    return { surface: s, format: pick.format, loss: pick.loss };
                });
                avgLoss = avgLoss / p0.length;
                if (!bestResult || avgLoss < bestResult.avgLoss) {
                    bestResult = { formats: pair, maxLoss: maxLoss, avgLoss: avgLoss, assignments: assignments };
                }
            }
        }
        return bestResult;
    }

    var recoFormatCount = 2;

    function renderRecommendation() {
        if (!surfaces.length) return;
        var result = computeRecommendation(recoFormatCount);
        if (!result) return;

        var winnerEl = document.getElementById('reco-winner');
        var compEl = document.getElementById('reco-comparison');
        var tableEl = document.getElementById('reco-coverage-table');

        var formatLabels = result.formats.map(function(f) { return '<strong>' + f.label + '</strong>'; }).join(' + ');
        winnerEl.innerHTML = '<div class="reco-winner-card">'
            + '<div class="reco-winner-label">Shoot in</div>'
            + '<div class="reco-winner-formats">' + formatLabels + '</div>'
            + '<div class="reco-winner-stats">'
            + '<span class="reco-stat">Avg loss: <strong>' + Math.round(result.avgLoss) + '%</strong></span>'
            + '<span class="reco-stat">Worst case: <strong>' + result.maxLoss + '%</strong></span>'
            + '</div>'
            + '</div>';

        var greenMulti = result.assignments.filter(function(a) { return a.loss <= 20; }).length;
        var totalSurfaces = result.assignments.length;

        if (recoFormatCount > 1) {
            var single = computeRecommendation(1);
            var greenSingle = single.assignments.filter(function(a) { return a.loss <= 20; }).length;
            compEl.innerHTML = '<div class="reco-comparison-grid">'
                + '<div class="reco-comp-card">'
                + '<div class="reco-comp-title">Single format (' + single.formats[0].label + ')</div>'
                + '<div class="reco-comp-metric">' + greenSingle + '/' + totalSurfaces + ' surfaces with &lt;20% loss</div>'
                + '<div class="reco-comp-metric">Avg: ' + Math.round(single.avgLoss) + '% loss</div>'
                + '</div>'
                + '<div class="reco-comp-card reco-comp-winner">'
                + '<div class="reco-comp-title">' + recoFormatCount + ' formats (' + result.formats.map(function(f){return f.label;}).join(' + ') + ')</div>'
                + '<div class="reco-comp-metric">' + greenMulti + '/' + totalSurfaces + ' surfaces with &lt;20% loss</div>'
                + '<div class="reco-comp-metric">Avg: ' + Math.round(result.avgLoss) + '% loss</div>'
                + '</div>'
                + '</div>';
        } else {
            compEl.innerHTML = '<div class="reco-comparison-grid">'
                + '<div class="reco-comp-card">'
                + '<div class="reco-comp-metric">' + greenMulti + '/' + totalSurfaces + ' P0 surfaces with &lt;20% loss</div>'
                + '<div class="reco-comp-metric">Worst case: ' + result.maxLoss + '% loss on portrait/wide surfaces</div>'
                + '</div>'
                + '</div>';
        }

        var rows = result.assignments.sort(function(a, b) { return a.loss - b.loss; }).map(function(a) {
            var severity = a.loss <= 20 ? 'good' : (a.loss <= 40 ? 'warn' : 'bad');
            return '<tr>'
                + '<td>' + a.surface.name + '</td>'
                + '<td><span class="reco-format-chip">' + a.format.label + '</span></td>'
                + '<td><span class="loss-badge-inline loss-' + severity + '">' + a.loss + '% loss</span></td>'
                + '</tr>';
        }).join('');

        tableEl.innerHTML = '<table class="reco-table">'
            + '<thead><tr><th>Surface (P0)</th><th>Assigned format</th><th>Crop loss</th></tr></thead>'
            + '<tbody>' + rows + '</tbody>'
            + '</table>';
    }

    // Recommendation toggle
    var recoToggle = document.querySelector('.reco-toggle');
    if (recoToggle) {
        recoToggle.addEventListener('click', function(e) {
            var btn = e.target.closest('.reco-toggle-btn');
            if (!btn) return;
            recoToggle.querySelectorAll('.reco-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            recoFormatCount = parseInt(btn.dataset.formats);
            renderRecommendation();
        });
    }

})();
