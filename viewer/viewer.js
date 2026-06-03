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
    const specsTabs = document.getElementById('specs-tabs');

    let surfaces = [];
    let imageUrl = null;
    let activeFilter = 'all';
    let specsFilter = 'all';
    let deviceWidth = 390;

    const DEVICE_PRESETS = {
        'all':       [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: '375px', width: 375 }, { label: '768px', width: 768 }, { label: '1280px', width: 1280 }, { label: 'Custom', width: 'custom' }],
        'web':       [{ label: '375px', width: 375 }, { label: '768px', width: 768 }, { label: '1280px', width: 1280 }, { label: '1440px', width: 1440 }, { label: 'Custom', width: 'custom' }],
        'mobile-rn': [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: 'Custom', width: 'custom' }],
        'ios':       [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: 'Custom', width: 'custom' }],
        'portrait':  [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: 'Custom', width: 'custom' }],
        'p0':        [{ label: 'SE', width: 320 }, { label: '14', width: 390 }, { label: '16 Pro', width: 430 }, { label: '375px', width: 375 }, { label: '768px', width: 768 }, { label: 'Custom', width: 'custom' }],
    };
    const PRESET_DEFAULT_WIDTH = {
        'all': 390, 'web': 375, 'mobile-rn': 390, 'ios': 390, 'portrait': 390, 'p0': 390
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

        if (clean.includes('portrait') && !explicit) return 2 / 3;

        const dim = clean.match(/(\d+)\s*[×x]\s*(\d+)/);
        if (dim) return parseInt(dim[1]) / parseInt(dim[2]);

        if (clean.toLowerCase().includes('dynamic') || clean.toLowerCase().includes('fluid')) return 16 / 9;
        if (clean.toLowerCase().includes('variable')) return 16 / 9;

        return 3 / 2;
    }

    function getPlatformKey(platform) {
        if (platform.includes('web')) return 'web';
        if (platform.includes('ios')) return 'ios';
        if (platform.includes('rn') || platform.includes('mobile')) return 'mobile-rn';
        return 'other';
    }

    function getPlatformBadges(platform) {
        return platform.split('/').map(function (p) {
            p = p.trim();
            var key = getPlatformKey(p.toLowerCase());
            var label = key === 'mobile-rn' ? 'Mobile' : key === 'ios' ? 'iOS' : key === 'web' ? 'Web' : p;
            return '<span class="empty-platform">' + label + '</span>';
        }).join('');
    }

    function isPortrait(ratio) {
        return ratio < 1;
    }

    // Source baseline: 3:2 landscape (1200×800)
    const SOURCE_RATIO = 3 / 2;

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
        if (targetRatio >= SOURCE_RATIO) return 100;
        return Math.round((targetRatio / SOURCE_RATIO) * 100);
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
            if (activeFilter === 'all') return true;
            if (activeFilter === 'p0') return s.priority === 'P0';
            if (activeFilter === 'portrait') return isPortrait(s.ratio);
            return getPlatformKey(s.platform) === activeFilter;
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

    function formatRatio(r) {
        var s = r.toFixed(2);
        s = s.replace(/\.?0+$/, '');
        return s + ':1';
    }

    function getTileWidth(surface) {
        var fd = (surface.fixedDim || '').toLowerCase();
        var fl = (surface.flexDim || '').toLowerCase();
        if (fd === 'both') return 280;
        // Scale if either dimension is container/screen-relative:
        //   - fl matches explicit flexible-width patterns (including 'both (carousel)' variants)
        //   - fd is full-bleed (width locked to device, e.g. parallax headers)
        //   - fd references screen width (e.g. 'width=2/3 screen')
        //   - flexDim carries a numeric range (e.g. '300–680px')
        // Breakpoint-snap: flexDim encodes two fixed sizes at breakpoints (e.g. '72–90px (breakpoints)')
        // Breakpoint-snap: normalize so the larger breakpoint = 280 display px,
        // smaller = proportionally reduced. Avoids rendering literal tiny px values.
        var bpMatch = fl.match(/(\d+)[–\-](\d+)px.*breakpoint/i);
        if (bpMatch) {
            var bpSmall = parseInt(bpMatch[1]);
            var bpLarge = parseInt(bpMatch[2]);
            return deviceWidth >= 500 ? 280 : Math.round((bpSmall / bpLarge) * 280);
        }
        var flexWidthRelative = fl === 'width=container' || fl === 'width=full-bleed' || fl.startsWith('both') || parseFlexRange(surface.flexDim);
        var fixedWidthRelative = fd === 'width=full-bleed' || fd.includes('screen');
        if (flexWidthRelative || fixedWidthRelative) {
            // Scale relative to platform max: mobile max=430pt, web max=1440px
            var maxRef = deviceWidth >= 500 ? 1440 : 430;
            return Math.min(280, Math.round((deviceWidth / maxRef) * 280));
        }
        return 280;
    }

    function getDimChips(surface) {
        const chips = [];
        const fixed = (surface.fixedDim || '').toLowerCase();
        const flex = (surface.flexDim || '').toLowerCase();
        const isBothFixed = fixed === 'both';
        const isBothFlex = flex === 'both';
        if (isBothFixed) return [{ kind: 'fixed', text: 'Fixed px' }];
        if (fixed && fixed !== '—' && fixed !== 'both') {
            chips.push({ kind: 'fixed', text: surface.fixedDim });
        }
        if (flex && flex !== '—' && flex !== 'both') {
            chips.push({ kind: 'flex', text: surface.flexDim });
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

        const sourceW = 1200;
        const sourceH = 800;

        // Visible portion of source after center crop
        const visibleWPx = targetRatio >= SOURCE_RATIO ? sourceW : sourceW * (targetRatio / SOURCE_RATIO);
        const visibleHPx = targetRatio >= SOURCE_RATIO ? sourceW / targetRatio : sourceH;
        const visibleLeftPx = (sourceW - visibleWPx) / 2;
        const visibleTopPx = (sourceH - visibleHPx) / 2;

        let safeLeft, safeRight, safeTop, safeBottom;
        if (mode === 'conservative') {
            safeLeft = 200; safeRight = 1000; safeTop = 120; safeBottom = 680;
        } else if (mode === 'usable') {
            safeLeft = 66; safeRight = 1134; safeTop = 60; safeBottom = 740;
        } else if (mode === 'survival') {
            safeLeft = 333; safeRight = 867; safeTop = 0; safeBottom = 800;
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
        const pct = widthVisiblePct(surface.ratio);
        const severity = lossSeverity(pct);
        const chips = getDimChips(surface);
        const platformLabel = getPlatformBadges(surface.platform);
        const ratioClean = surface.ratioRaw.replace(/\*\*/g, '');
        const portrait = isPortrait(surface.ratio);
        const imgSrc = imageUrl || DEMO_IMAGE;

        // Safe zone explanation for this surface
        const safeZoneNotes = [];
        if (portrait) {
            safeZoneNotes.push('⚠️ Portrait surface: a 3:2 landscape source loses <strong>' + (100 - pct) + '% of its width</strong> in a center crop. Only the central ' + pct + '% of width survives.');
            safeZoneNotes.push('To guarantee subject visibility, all key content must fall within the central <strong>' + Math.round(1200 * (surface.ratio / SOURCE_RATIO)) + 'px</strong> of the 1200px source width.');
            safeZoneNotes.push('The Conservative (800px usable) and Usable (1068px) safe zones both extend well beyond this limit — neither protects content from a portrait crop.');
        } else if (pct < 100) {
            safeZoneNotes.push('Some horizontal cropping occurs (' + pct + '% width visible). Subject should be centred.');
        } else {
            safeZoneNotes.push('Full source width is visible. Height may be cropped for very wide ratios.');
        }

        const range = parseFlexRange(surface.flexDim);
        const rangeHtml = range ? range.min + range.unit + ' – ' + range.max + range.unit : null;

        const fixedFlexHtml = chips.length > 0
            ? chips.map(c => '<span class="dim-chip dim-chip-' + c.kind + '">' + (c.kind === 'fixed' ? '🔒 ' : '↔ ') + c.text + '</span>').join(' ')
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
                    <div class="detail-image-container" style="padding-bottom:${(1 / surface.ratio * 100)}%">
                        <img src="${imgSrc}" alt="${surface.name}">
                        ${surface.hasLabel && surface.labelPosition !== '—' ? renderLabelSlotsHtml(surface.labelPosition) : ''}
                        <div class="loss-badge loss-${severity}">${pct}% width</div>
                    </div>
                    <p class="detail-ratio-label">${ratioClean}${portrait ? ' · <span class="badge-portrait">Portrait</span>' : ''}</p>
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
                        <dt>Crop mode</dt><dd>Center crop (all platforms)</dd>
                        <dt>Width visible</dt><dd><span class="loss-badge-inline loss-${severity}">${pct}%</span></dd>
                        <dt>Width lost</dt><dd>${100 - pct}%</dd>
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
                    <h3>Creative requirements</h3>
                    <ul class="detail-checklist">
                        ${portrait ? '<li class="checklist-warn">Portrait surface — subject must be centred within the middle ' + pct + '% of source width. Landscape compositions will lose the subject.</li>' : ''}
                        ${chips.some(c => c.kind === 'flex') ? '<li class="checklist-warn">Flexible dimension — container width varies. Compose for the narrowest expected viewport; wide platings or edge-anchored props will be cropped unpredictably.</li>' : ''}
                        ${surface.hasLabel ? '<li class="checklist-info">UI elements appear at: ' + surface.labelPosition + '. Keep these areas free of key text, faces, or plating details.</li>' : ''}
                        <li>All crops use center crop — no stretching or distortion. Only edges are lost.</li>
                        <li>Source minimum: 1200×800px at 3:2. sRGB, JPG, no alpha channel.</li>
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
        if (!imageUrl || surfaces.length === 0) return;

        const showLabels = showLabelsCheckbox.checked;
        tilesContainer.innerHTML = '';

        const filtered = sortByPriority(applyFilter(surfaces));

        filtered.forEach(surface => {
            const tile = document.createElement('div');
            tile.className = 'tile';

            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'tile-image-wrapper';
            imageWrapper.style.width = getTileWidth(surface) + 'px';

            const imgContainer = document.createElement('div');
            imgContainer.className = 'tile-image-container';
            imgContainer.style.paddingBottom = (1 / surface.ratio * 100) + '%';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = surface.name;
            imgContainer.appendChild(img);

            // Safe-zone overlay (Conservative / Usable / 2:3 survival)
            const overlay = getSafeZoneOverlay(surface.ratio);
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

            // Fixed/flex chips below the image
            const chips = getDimChips(surface);
            if (chips.length > 0) {
                const chipRow = document.createElement('div');
                chipRow.className = 'dim-chips';
                chips.forEach(c => {
                    const chip = document.createElement('span');
                    chip.className = 'dim-chip dim-chip-' + c.kind;
                    chip.textContent = (c.kind === 'fixed' ? '🔒 ' : '↔ ') + c.text;
                    chipRow.appendChild(chip);
                });
                imageWrapper.appendChild(chipRow);
            }

            const pct = widthVisiblePct(surface.ratio);
            const meta = document.createElement('div');
            meta.className = 'tile-meta';

            const portraitBadge = isPortrait(surface.ratio)
                ? '<span class="badge-portrait">Portrait</span>'
                : '';
            const journeyBadge = surface.journey && surface.journey !== '—'
                ? '<span class="badge-journey">' + surface.journey + '</span>'
                : '';

            meta.innerHTML = `
                <div class="surface-name">${surface.name}${portraitBadge}</div>
                <div class="surface-details">
                    <span>${getPlatformBadges(surface.platform)}</span>
                    <span>${surface.ratioRaw.replace(/\*\*/g, '')}</span>
                    <span>${surface.resolution}</span>
                    ${journeyBadge}
                    <span class="loss-badge-inline loss-${lossSeverity(pct)}">${pct}% width</span>
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
        container.innerHTML = '';

        filtered.forEach(surface => {
            const card = document.createElement('div');
            card.className = 'empty-card';

            const tileW = getTileWidth(surface);
            if (tileW < 280) {
                card.style.width = Math.round((tileW / 280) * 100) + '%';
                card.style.justifySelf = 'start';
            }

            const shape = document.createElement('div');
            shape.className = 'empty-shape';
            shape.style.paddingBottom = (1 / surface.ratio * 100) + '%';

            const img = document.createElement('img');
            img.src = DEMO_IMAGE;
            img.alt = surface.name;
            shape.appendChild(img);

            // Safe-zone overlay
            const overlay = getSafeZoneOverlay(surface.ratio);
            if (overlay) {
                const safeRect = document.createElement('div');
                safeRect.className = 'safe-zone-overlay sz-' + overlay.mode;
                safeRect.style.left = overlay.left + '%';
                safeRect.style.top = overlay.top + '%';
                safeRect.style.width = overlay.width + '%';
                safeRect.style.height = overlay.height + '%';
                shape.appendChild(safeRect);
            }

            // Label slots — render in empty state too (G5)
            if (showLabels && surface.hasLabel && surface.labelPosition !== '—') {
                const positions = surface.labelPosition.toLowerCase();
                if (positions.includes('top-right')) shape.appendChild(createLabelSlot('top-right', ''));
                if (positions.includes('top-left')) shape.appendChild(createLabelSlot('top-left', ''));
                if (positions.includes('bottom-left')) shape.appendChild(createLabelSlot('bottom-left', ''));
                if (positions.includes('bottom-right')) shape.appendChild(createLabelSlot('bottom-right', ''));
            }

            const pct = widthVisiblePct(surface.ratio);

            const label = document.createElement('div');
            label.className = 'empty-label';

            label.innerHTML = surface.name + ' ' + getPlatformBadges(surface.platform)
                + '<br><span class="loss-badge-inline loss-' + lossSeverity(pct) + '" style="margin-top:0.3rem;display:inline-block">' + pct + '% width</span>';

            // Fixed/flex chips below the label
            const chips = getDimChips(surface);
            if (chips.length > 0) {
                const chipRow = document.createElement('div');
                chipRow.className = 'empty-dim-chips';
                chips.forEach(c => {
                    const chip = document.createElement('span');
                    chip.className = 'dim-chip dim-chip-' + c.kind;
                    chip.textContent = (c.kind === 'fixed' ? '🔒 ' : '↔ ') + c.text;
                    chipRow.appendChild(chip);
                });
                card.appendChild(shape);
                card.appendChild(label);
                card.appendChild(chipRow);
            } else {
                card.appendChild(shape);
                card.appendChild(label);
            }

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
            return getPlatformKey(s.platform) === filterToUse;
        }));

        let html = '<table class="specs"><thead><tr>';
        html += '<th>Preview</th>';
        html += '<th>Placement</th>';
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
            const ratioClean = surface.ratioRaw.replace(/\*\*/g, '');
            const labelInfo = surface.hasLabel ? surface.labelPosition : '—';
            const notes = [];
            if (ratioClean.toLowerCase().includes('dynamic') || ratioClean.toLowerCase().includes('fluid') || ratioClean.toLowerCase().includes('variable')) {
                notes.push('Dynamic sizing');
            }
            if (isPortrait(surface.ratio)) {
                notes.push('Portrait');
            }
            const noteStr = notes.length > 0 ? notes.join(', ') : '';
            const labelAndNotes = [labelInfo, noteStr].filter(Boolean).join(' · ');

            const pct = widthVisiblePct(surface.ratio);
            const lossClass = 'loss-' + lossSeverity(pct);

            const priority = surface.priority || '—';
            const priorityClass = priority !== '—' ? 'badge-' + priority.toLowerCase() : '';
            const journey = surface.journey || '—';

            html += '<tr>';
            html += '<td class="spec-preview-cell"><div class="spec-preview" style="padding-bottom:' + (1 / surface.ratio * 100) + '%"><img src="' + (imageUrl || DEMO_IMAGE) + '" alt=""></div></td>';
            html += '<td class="spec-name">' + surface.name + '</td>';
            html += '<td>' + journey + '</td>';
            html += '<td>' + ratioClean + '</td>';
            html += '<td><span class="loss-badge-inline ' + lossClass + '">' + pct + '%</span></td>';
            const chips = getDimChips(surface);
            const bpMatch = (surface.flexDim || '').match(/(\d+)[–\-](\d+)(px|pt).*breakpoint/i);
            const fixedChips = chips.filter(c => c.kind === 'fixed');
            const flexChips  = chips.filter(c => c.kind === 'flex');
            const fixedHtml = fixedChips.length
                ? fixedChips.map(c => '<span class="dim-chip dim-chip-fixed">' + c.text + '</span>').join(' ')
                : '<span style="color:var(--color-foreground-secondary);font-size:0.7rem">—</span>';
            let flexHtml = flexChips.length
                ? flexChips.map(c => '<span class="dim-chip dim-chip-flex">' + c.text + '</span>').join(' ')
                : '<span style="color:var(--color-foreground-secondary);font-size:0.7rem">—</span>';
            if (bpMatch) {
                flexHtml = '<span class="dim-chip dim-chip-fixed">' + bpMatch[1] + bpMatch[3] + ' &lt;768px</span>'
                         + ' <span class="dim-chip dim-chip-fixed">' + bpMatch[2] + bpMatch[3] + ' ≥768px</span>';
            }
            html += '<td>' + fixedHtml + '</td>';
            html += '<td>' + flexHtml + '</td>';
            var ratioRange = computeRatioRange(surface);
            var ratioRangeText = ratioRange
                ? (ratioRange.single ? formatRatio(ratioRange.min) : formatRatio(ratioRange.min) + ' – ' + formatRatio(ratioRange.max))
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

    function handleImage(file) {
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            imageUrl = e.target.result;
            closeModal();
            emptyState.classList.add('hidden');
            gallery.classList.remove('hidden');
            controls.classList.remove('hidden');
            renderTiles();
            updateContextImages();
        };
        reader.readAsDataURL(file);
    }

    function openModal() {
        modalOverlay.classList.remove('hidden');
    }

    function closeModal() {
        modalOverlay.classList.add('hidden');
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
        if (view === 'context') updateContextImages();
        if (view === 'specs') renderSpecsTable();
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

    const deviceSelector = document.getElementById('device-selector');
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
            renderEmptyState();
            renderSpecsTable();
            updateContextImages();
        })
        .catch(() => {
            surfaces = getFallbackSurfaces();
            renderEmptyState();
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
})();
