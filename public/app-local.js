// app-local.js — local extensions: parent quick-select by ID + preset selection save/restore
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

    // ── DOM helpers ───────────────────────────────────────────

    // Returns the instance IDs of currently selected own parents (in slot order)
    function readSelectedParentIds() {
        const ids = [];
        document.querySelectorAll('#parent-grid .grid-card.selected').forEach(card => {
            const kicker = card.querySelector('.grid-card-kicker');
            const m = kicker && kicker.textContent.match(/ID:\s*(\d+)/);
            if (m) ids.push(parseInt(m[1]));
        });
        return ids;
    }

    // Simulate-click the parent card matching instanceId (if not already selected and not full)
    function clickParentById(instanceId) {
        const target = parseInt(instanceId);
        if (!target) return false;
        let found = false;
        document.querySelectorAll('#parent-grid .grid-card').forEach(card => {
            if (found) return;
            const kicker = card.querySelector('.grid-card-kicker');
            const m = kicker && kicker.textContent.match(/ID:\s*(\d+)/);
            if (m && parseInt(m[1]) === target && !card.classList.contains('vet-full')) {
                card.click();
                found = true;
            }
        });
        return found;
    }

    // ── Set a specific parent slot ────────────────────────────

    // slotIdx: 0 = Parent 1, 1 = Parent 2
    function setParentSlot(slotIdx, instanceId) {
        const slot1 = document.getElementById('team-slot-vet1');
        const slot2 = document.getElementById('team-slot-vet2');
        if (!slot1 || !slot2) return false;

        if (slotIdx === 0) {
            // Save old P2 before clearing, so we can restore it after
            const currentIds = readSelectedParentIds();
            const oldP2Id = currentIds[1];
            // Deselect P2 first (so P1 deselect doesn't shift P2 into P1 slot)
            if (slot2.classList.contains('filled')) slot2.click();
            if (slot1.classList.contains('filled')) slot1.click();
            const ok = clickParentById(instanceId);
            // Restore old P2 (if it existed and is different from new P1)
            if (oldP2Id && oldP2Id !== parseInt(instanceId)) {
                clickParentById(oldP2Id);
            }
            return ok;
        } else {
            // Just replace P2
            if (slot2.classList.contains('filled')) slot2.click();
            return clickParentById(instanceId);
        }
    }

    // ── Save/Restore selection ────────────────────────────────

    function saveSelectionForPreset(presetName) {
        const parentIds = readSelectedParentIds();
        const data = {
            parent_id_1: parentIds[0] ?? null,
            parent_id_2: parentIds[1] ?? null,
            deck_id: null,
            trainee_id: null,
            friend_viewer_id: null,
            friend_support_id: null,
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

        const all = loadAll();
        all[presetName] = data;
        saveAll(all);
        return data;
    }

    function applyPresetSelection(presetName) {
        const saved = loadAll()[presetName];
        if (!saved) return;

        // Deck
        if (saved.deck_id) {
            const deckEl = document.querySelector(`.deck-container[data-deck-id="${saved.deck_id}"]`);
            if (deckEl && !deckEl.classList.contains('selected')) deckEl.click();
        }

        // Trainee
        if (saved.trainee_id) {
            const traineeEl = document.querySelector(`#uma-grid .grid-card[data-trainee-id="${saved.trainee_id}"]`);
            if (traineeEl && !traineeEl.classList.contains('selected')) traineeEl.click();
        }

        // Parents — clear existing slots, then re-select in order
        const slot1 = document.getElementById('team-slot-vet1');
        const slot2 = document.getElementById('team-slot-vet2');
        if (slot2 && slot2.classList.contains('filled')) slot2.click();
        if (slot1 && slot1.classList.contains('filled')) slot1.click();

        const p1Input = document.getElementById('parent-id-1-input');
        const p2Input = document.getElementById('parent-id-2-input');

        if (saved.parent_id_1) {
            const found = clickParentById(saved.parent_id_1);
            if (p1Input) p1Input.value = found ? saved.parent_id_1 : '';
        }
        if (saved.parent_id_2) {
            const found = clickParentById(saved.parent_id_2);
            if (p2Input) p2Input.value = found ? saved.parent_id_2 : '';
        }

        // Friend — try now, and again after async friend load completes
        function tryFriend() {
            if (!saved.friend_viewer_id) return;
            const friendEl = document.querySelector(
                `#friend-grid .grid-card[data-viewer-id="${saved.friend_viewer_id}"][data-support-id="${saved.friend_support_id}"]`
            );
            if (friendEl && !friendEl.classList.contains('selected')) friendEl.click();
        }
        tryFriend();
        setTimeout(tryFriend, 2500);
    }

    // ── Parent ID input handler ───────────────────────────────

    function attachParentInput(inputEl, slotIdx) {
        inputEl.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const id = parseInt(inputEl.value);
            if (!id || id <= 0) return;
            const ok = setParentSlot(slotIdx, id);
            if (!ok) {
                // Flash red to signal ID not found
                inputEl.style.outline = '2px solid red';
                setTimeout(() => { inputEl.style.outline = ''; }, 1500);
            }
        });
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
            .parent-id-input {
                font-size: 0.8rem !important;
                padding: 4px 6px !important;
                height: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ── Init ─────────────────────────────────────────────────

    function init() {
        injectStyles();

        const p1Input = document.getElementById('parent-id-1-input');
        const p2Input = document.getElementById('parent-id-2-input');
        if (p1Input) attachParentInput(p1Input, 0);
        if (p2Input) attachParentInput(p2Input, 1);

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

        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', () => {
                // Small delay to let app.js finish its own change handler first
                setTimeout(() => applyPresetSelection(presetSelect.value), 150);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
