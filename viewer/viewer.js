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
    const filterBar = document.getElementById('filter-bar');

    const DEMO_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=800&fit=crop';

    let surfaces = [];
    let imageUrl = null;
    let activeFilter = 'all';

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

            rows.push({
                name: cells[0],
                platform: cells[1].toLowerCase(),
                ratioRaw: cells[2],
                ratio: parseRatio(cells[2]),
                resolution: cells[3],
                hasLabel: cells[4].toLowerCase() === 'yes',
                labelPosition: cells[5],
                source: cells[6]
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

    function isPortrait(ratio) {
        return ratio < 1;
    }

    function renderTiles() {
        if (!imageUrl || surfaces.length === 0) return;

        const showLabels = showLabelsCheckbox.checked;
        tilesContainer.innerHTML = '';

        const filtered = surfaces.filter(s => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'portrait') return isPortrait(s.ratio);
            return getPlatformKey(s.platform) === activeFilter;
        });

        filtered.forEach(surface => {
            const tile = document.createElement('div');
            tile.className = 'tile';

            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'tile-image-wrapper';

            const imgContainer = document.createElement('div');
            imgContainer.className = 'tile-image-container';
            imgContainer.style.paddingBottom = (1 / surface.ratio * 100) + '%';

            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = surface.name;
            imgContainer.appendChild(img);

            if (showLabels && surface.hasLabel && surface.labelPosition !== '—') {
                const positions = surface.labelPosition.toLowerCase();
                if (positions.includes('top-right')) imgContainer.appendChild(createLabelSlot('top-right', 'Label'));
                if (positions.includes('top-left')) imgContainer.appendChild(createLabelSlot('top-left', 'Badge'));
                if (positions.includes('bottom-left')) imgContainer.appendChild(createLabelSlot('bottom-left', 'Tag'));
                if (positions.includes('bottom-right')) imgContainer.appendChild(createLabelSlot('bottom-right', 'Pill'));
            }

            imageWrapper.appendChild(imgContainer);

            const meta = document.createElement('div');
            meta.className = 'tile-meta';

            const portraitBadge = isPortrait(surface.ratio)
                ? '<span class="badge-portrait">Portrait</span>'
                : '';

            meta.innerHTML = `
                <div class="surface-name">${surface.name}${portraitBadge}</div>
                <div class="surface-details">
                    <span>${surface.platform}</span>
                    <span>${surface.ratioRaw.replace(/\*\*/g, '')}</span>
                    <span>${surface.resolution}</span>
                </div>
            `;

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

        const filtered = surfaces.filter(s => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'portrait') return isPortrait(s.ratio);
            return getPlatformKey(s.platform) === activeFilter;
        });

        countEl.textContent = filtered.length;
        container.innerHTML = '';

        filtered.forEach(surface => {
            const card = document.createElement('div');
            card.className = 'empty-card';

            const shape = document.createElement('div');
            shape.className = 'empty-shape';
            shape.style.paddingBottom = (1 / surface.ratio * 100) + '%';

            const img = document.createElement('img');
            img.src = DEMO_IMAGE;
            img.alt = surface.name;
            shape.appendChild(img);

            const label = document.createElement('div');
            label.className = 'empty-label';

            const platformKey = getPlatformKey(surface.platform);
            const platformLabel = platformKey === 'mobile-rn' ? 'Mobile' : platformKey === 'ios' ? 'iOS' : 'Web';
            label.innerHTML = surface.name + ' <span class="empty-platform">' + platformLabel + '</span>';

            card.appendChild(shape);
            card.appendChild(label);
            container.appendChild(card);
        });
    }

    function renderSpecsTable() {
        const container = document.getElementById('specs-table');
        if (!container || surfaces.length === 0) return;

        const filtered = surfaces.filter(s => {
            if (activeFilter === 'all') return true;
            if (activeFilter === 'portrait') return isPortrait(s.ratio);
            return getPlatformKey(s.platform) === activeFilter;
        });

        let html = '<table class="specs"><thead><tr>';
        html += '<th>Preview</th>';
        html += '<th>Placement</th>';
        html += '<th>Aspect Ratio</th>';
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

            html += '<tr>';
            html += '<td class="spec-preview-cell"><div class="spec-preview" style="padding-bottom:' + (1 / surface.ratio * 100) + '%"><img src="' + (imageUrl || DEMO_IMAGE) + '" alt=""></div></td>';
            html += '<td class="spec-name">' + surface.name + '</td>';
            html += '<td>' + ratioClean + '</td>';
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
        if (imageUrl) {
            renderTiles();
        } else {
            renderEmptyState();
            renderSpecsTable();
        }
    });

    // Controls
    showLabelsCheckbox.addEventListener('change', renderTiles);
    safeZoneSelect.addEventListener('change', renderTiles);

    // Keyboard shortcut
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    // Load surfaces
    fetch(SURFACES_PATH)
        .then(r => r.text())
        .then(md => {
            surfaces = parseSurfacesTable(md);
            renderEmptyState();
            renderSpecsTable();
        })
        .catch(() => {
            surfaces = getFallbackSurfaces();
            renderEmptyState();
            renderSpecsTable();
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
