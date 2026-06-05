// app-local.js — local extensions: parent quick-select by ID + team setup slots + preset selection save/restore
// This file is separate from app.js to avoid merge conflicts with upstream.
(function () {
    'use strict';

    const STORAGE_KEY = 'uma_preset_selections';

    // ── Storage helpers ───────────────────────────────────────

    function loadAll() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    }

    function saveAll(obj) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }

    async function apiLoadTeamSetups() {
        try {
            const res = await fetch('/api/setup-presets');
            const json = await res.json();
            return json.success ? (json.setups || {}) : {};
        } catch { return {}; }
    }

    async function apiSaveTeamSetup(name, data) {
        await fetch('/api/setup-presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, data })
        });
    }

    async function apiDeleteTeamSetup(name) {
        await fetch('/api/setup-presets/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
    }

    // ── DOM helpers ───────────────────────────────────────────

    function readSelectedParentIds() {
        const ids = [];
        document.querySelectorAll('#parent-grid .grid-card.selected').forEach(card => {
            const kicker = card.querySelector('.grid-card-kicker');
            const m = kicker && kicker.textContent.match(/ID:\s*(\d+)/);
            if (m) ids.push(parseInt(m[1]));
        });
        return ids;
    }

    function clickParentById(instanceId) {
        const target = parseInt(instanceId);
        if (!target) return false;
        const cards = document.querySelectorAll('#parent-grid .grid-card');
        let found = false;
        cards.forEach((card) => {
            if (found) return;
            const kicker = card.querySelector('.grid-card-kicker');
            const m = kicker && kicker.textContent.match(/ID:\s*(\d+)/);
            const cardId = m ? parseInt(m[1]) : null;
            if (m && cardId === target && !card.classList.contains('vet-full')) {
                card.click();
                found = true;
            }
        });
        return found;
    }

    // ── Set a specific parent slot ────────────────────────────

    function setParentSlot(slotIdx, instanceId) {
        const slot1 = document.getElementById('team-slot-vet1');
        const slot2 = document.getElementById('team-slot-vet2');
        if (!slot1 || !slot2) return false;

        if (slotIdx === 0) {
            const currentIds = readSelectedParentIds();
            const oldP2Id = currentIds[1];
            if (slot2.classList.contains('filled')) slot2.click();
            if (slot1.classList.contains('filled')) slot1.click();
            const ok = clickParentById(instanceId);
            if (oldP2Id && oldP2Id !== parseInt(instanceId)) {
                clickParentById(oldP2Id);
            }
            return ok;
        } else {
            if (slot2.classList.contains('filled')) slot2.click();
            return clickParentById(instanceId);
        }
    }

    // ── Capture / Apply selection data ───────────────────────

    function captureSelection() {
        const parentIds = readSelectedParentIds();
        const data = {
            parent_id_1: parentIds[0] ?? null,
            parent_id_2: parentIds[1] ?? null,
            deck_id: null,
            trainee_id: null,
            friend_viewer_id: null,
            friend_support_id: null,
            delay_min: null,
            delay_max: null,
            burn_clocks: null,
            loop_enabled: null,
            loop_max: null,
        };

        const deckEl = document.querySelector('.deck-container.selected[data-deck-id]');
        if (deckEl) data.deck_id = deckEl.getAttribute('data-deck-id');

        const traineeEl = document.querySelector('#uma-grid .grid-card.selected[data-trainee-id]');
        if (traineeEl) data.trainee_id = traineeEl.getAttribute('data-trainee-id');

        const friendEl = document.querySelector('#friend-grid .grid-card.selected[data-viewer-id]');
        if (friendEl) {
            data.friend_viewer_id = friendEl.getAttribute('data-viewer-id');
            data.friend_support_id = friendEl.getAttribute('data-support-id');
        }

        const minEl = document.getElementById('turn-delay-min');
        const maxEl = document.getElementById('turn-delay-max');
        if (minEl) data.delay_min = parseFloat(minEl.value);
        if (maxEl) data.delay_max = parseFloat(maxEl.value);

        const burnBtn = document.getElementById('burn-clocks-btn');
        if (burnBtn) data.burn_clocks = burnBtn.classList.contains('is-active');

        const loopBtn = document.getElementById('dev-career-btn');
        if (loopBtn) data.loop_enabled = loopBtn.classList.contains('is-active');

        const loopMaxEl = document.getElementById('loop-max-input');
        if (loopMaxEl) data.loop_max = parseInt(loopMaxEl.value) || 0;

        return data;
    }

    function applySelectionData(data) {
        if (!data) return;

        if (data.deck_id) {
            const deckEl = document.querySelector(`.deck-container[data-deck-id="${data.deck_id}"]`);
            if (deckEl && !deckEl.classList.contains('selected')) deckEl.click();
        }

        if (data.trainee_id) {
            const traineeEl = document.querySelector(`#uma-grid .grid-card[data-trainee-id="${data.trainee_id}"]`);
            if (traineeEl && !traineeEl.classList.contains('selected')) traineeEl.click();
        }

        const slot1 = document.getElementById('team-slot-vet1');
        const slot2 = document.getElementById('team-slot-vet2');
        if (slot2 && slot2.classList.contains('filled')) slot2.click();
        if (slot1 && slot1.classList.contains('filled')) slot1.click();

        const p1Input = document.getElementById('parent-id-1-input');
        const p2Input = document.getElementById('parent-id-2-input');

        if (data.parent_id_1) {
            const found = clickParentById(data.parent_id_1);
            if (p1Input) p1Input.value = found ? data.parent_id_1 : '';
        }
        if (data.parent_id_2) {
            const found = clickParentById(data.parent_id_2);
            if (p2Input) p2Input.value = found ? data.parent_id_2 : '';
        }

        function tryFriend() {
            if (!data.friend_viewer_id) return;
            const friendEl = document.querySelector(
                `#friend-grid .grid-card[data-viewer-id="${data.friend_viewer_id}"][data-support-id="${data.friend_support_id}"]`
            );
            if (friendEl && !friendEl.classList.contains('selected')) friendEl.click();
        }
        tryFriend();
        setTimeout(tryFriend, 2500);

        // Delay
        if (data.delay_min != null && data.delay_max != null) {
            const minEl = document.getElementById('turn-delay-min');
            const maxEl = document.getElementById('turn-delay-max');
            if (minEl && maxEl) {
                minEl.value = data.delay_min;
                maxEl.value = data.delay_max;
                minEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Burn clocks
        if (data.burn_clocks != null) {
            const burnBtn = document.getElementById('burn-clocks-btn');
            if (burnBtn && !burnBtn.disabled) {
                const current = burnBtn.classList.contains('is-active');
                if (current !== data.burn_clocks) burnBtn.click();
            }
        }

        // Loop
        if (data.loop_enabled != null) {
            const loopBtn = document.getElementById('dev-career-btn');
            if (loopBtn) {
                const current = loopBtn.classList.contains('is-active');
                if (current !== data.loop_enabled) loopBtn.click();
            }
        }

        // Loop max
        if (data.loop_max != null) {
            const loopMaxEl = document.getElementById('loop-max-input');
            if (loopMaxEl) loopMaxEl.value = data.loop_max;
        }
    }

    // ── Per-preset save/restore (for auto-load on preset switch) ──

    function saveSelectionForPreset(presetName) {
        const all = loadAll();
        all[presetName] = captureSelection();
        saveAll(all);
        return all[presetName];
    }

    function applyPresetSelection(presetName) {
        const saved = loadAll()[presetName];
        if (!saved) return;
        applySelectionData(saved);
    }

    // ── Team Setups dropdown ──────────────────────────────────

    async function populateTeamSetupDropdown(selectName) {
        const sel = document.getElementById('team-setup-select');
        if (!sel) return;
        const setups = await apiLoadTeamSetups();
        const names = Object.keys(setups);
        const current = selectName !== undefined ? selectName : sel.value;
        sel.innerHTML = '<option value="">— select setup —</option>' +
            names.map(n => `<option value="${n.replace(/"/g, '&quot;')}">${n.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</option>`).join('');
        if (current && names.includes(current)) sel.value = current;
    }

    function injectTeamSetupUI() {
        const anchor = document.getElementById('preset-section');
        if (!anchor || document.getElementById('team-setup-section')) return;

        const section = document.createElement('section');
        section.className = 'dashboard-section';
        section.id = 'team-setup-section';
        section.innerHTML = `
            <h2 class="dashboard-section-title">TEAM SETUP</h2>
            <div class="master-data-panel">
                <select id="team-setup-select" class="form-input team-setup-select"></select>
                <div class="team-setup-actions">
                    <button id="team-setup-save-btn" class="btn btn-sm" type="button">SAVE</button>
                    <button id="team-setup-del-btn" class="btn btn-sm btn-danger" type="button">DEL</button>
                </div>
            </div>
        `;
        anchor.parentNode.insertBefore(section, anchor);

        populateTeamSetupDropdown();

        const sel = document.getElementById('team-setup-select');
        const saveBtn = document.getElementById('team-setup-save-btn');
        const delBtn = document.getElementById('team-setup-del-btn');

        sel.addEventListener('change', async () => {
            if (!sel.value) return;
            const setups = await apiLoadTeamSetups();
            applySelectionData(setups[sel.value]);
        });

        saveBtn.addEventListener('click', async () => {
            const defaultName = sel.value || '';
            const name = prompt('Save team setup as:', defaultName);
            if (!name || !name.trim()) return;
            const trimmed = name.trim();
            await apiSaveTeamSetup(trimmed, captureSelection());
            await populateTeamSetupDropdown(trimmed);
            const orig = saveBtn.textContent;
            saveBtn.textContent = 'SAVED!';
            setTimeout(() => { saveBtn.textContent = orig; }, 1200);
        });

        delBtn.addEventListener('click', async () => {
            if (!sel.value) return;
            if (!confirm(`Delete setup "${sel.value}"?`)) return;
            await apiDeleteTeamSetup(sel.value);
            await populateTeamSetupDropdown('');
        });
    }

    // ── Parent ID input handler ───────────────────────────────

    function attachParentInput(inputEl, slotIdx, btnEl) {
        function trySelect() {
            const id = parseInt(inputEl.value);
            if (!id || id <= 0) return;
            const ok = setParentSlot(slotIdx, id);
            if (ok) {
                inputEl.value = '';
                inputEl.style.outline = '2px solid #22c55e';
                setTimeout(() => { inputEl.style.outline = ''; }, 800);
            } else {
                inputEl.style.outline = '2px solid #ef4444';
                inputEl.title = 'ID not found in parent list';
                setTimeout(() => { inputEl.style.outline = ''; inputEl.title = ''; }, 2000);
            }
        }
        inputEl.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            trySelect();
        });
        if (btnEl) btnEl.addEventListener('click', trySelect);
    }

    // ── Styles ────────────────────────────────────────────────

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .parent-id-inputs {
                display: flex;
                gap: 8px;
                padding: 4px 0 2px;
            }
            .parent-id-row {
                display: flex;
                flex-direction: column;
                gap: 3px;
                flex: 1;
            }
            .parent-id-label {
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.06em;
                opacity: 0.55;
                text-transform: uppercase;
            }
            .parent-id-field {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            .parent-id-input {
                font-size: 0.8rem !important;
                padding: 4px 6px !important;
                height: auto !important;
                flex: 1;
                min-width: 0;
            }
            .parent-id-btn {
                height: auto !important;
                padding: 4px 10px !important;
                font-size: 0.75rem !important;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .team-setup-select {
                width: 100%;
                margin-bottom: 0.4rem;
            }
            .team-setup-actions {
                display: flex;
                gap: 0.5rem;
            }
            .team-setup-actions .btn {
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Init ─────────────────────────────────────────────────

    function init() {
        injectStyles();

        const p1Input = document.getElementById('parent-id-1-input');
        const p2Input = document.getElementById('parent-id-2-input');
        const p1Btn = document.getElementById('parent-id-1-btn');
        const p2Btn = document.getElementById('parent-id-2-btn');
        if (p1Input) attachParentInput(p1Input, 0, p1Btn);
        if (p2Input) attachParentInput(p2Input, 1, p2Btn);

        const saveBtn = document.getElementById('preset-save-selection-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const sel = document.getElementById('preset-select');
                if (!sel || !sel.value) { alert('No preset selected.'); return; }
                saveSelectionForPreset(sel.value);
                const orig = saveBtn.textContent;
                saveBtn.textContent = 'SAVED!';
                setTimeout(() => { saveBtn.textContent = orig; }, 1500);
            });
        }

        injectTeamSetupUI();

        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', () => {
                setTimeout(() => applyPresetSelection(presetSelect.value), 150);
            });

            // Auto-apply on initial load: app.js sets innerHTML then .value without firing change
            // Skip if there is an ongoing career — autoLoadCareerSelection() in app.js handles that.
            const observer = new MutationObserver(() => {
                if (presetSelect.options.length > 0 && presetSelect.value) {
                    observer.disconnect();
                    if (!document.getElementById('career-pill')) {
                        setTimeout(() => applyPresetSelection(presetSelect.value), 300);
                    }
                }
            });
            observer.observe(presetSelect, { childList: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
