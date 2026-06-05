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
        console.log('[sweepy] clickParentById target:', target);
        if (!target) return false;
        const cards = document.querySelectorAll('#parent-grid .grid-card');
        console.log('[sweepy] parent grid cards found:', cards.length);
        let found = false;
        cards.forEach((card, i) => {
            if (found) return;
            const kicker = card.querySelector('.grid-card-kicker');
            const kickerText = kicker ? kicker.textContent : '(no kicker)';
            const m = kicker && kicker.textContent.match(/ID:\s*(\d+)/);
            const cardId = m ? parseInt(m[1]) : null;
            const isFull = card.classList.contains('vet-full');
            console.log(`[sweepy] card[${i}] kicker="${kickerText}" id=${cardId} vet-full=${isFull}`);
            if (m && cardId === target && !isFull) {
                console.log('[sweepy] clicking card', i);
                card.click();
                found = true;
            }
        });
        console.log('[sweepy] clickParentById result:', found);
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

    function attachParentInput(inputEl, slotIdx, btnEl) {
        console.log('[sweepy] attachParentInput slot', slotIdx, 'input:', inputEl, 'btn:', btnEl);
        function trySelect() {
            const id = parseInt(inputEl.value);
            console.log('[sweepy] trySelect slot', slotIdx, 'id:', id);
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

        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', () => {
                // Small delay to let app.js finish its own change handler first
                setTimeout(() => applyPresetSelection(presetSelect.value), 150);
            });

            // Auto-apply on initial load: app.js sets innerHTML then .value without firing change
            const observer = new MutationObserver(() => {
                if (presetSelect.options.length > 0 && presetSelect.value) {
                    observer.disconnect();
                    setTimeout(() => applyPresetSelection(presetSelect.value), 300);
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
