// js/portalTransit.js
// Portal-as-lesson: when the player crosses between worlds, play a 1.5s
// animated reaction showing the substrate transforming into the product
// via the named enzyme. The portal stops being a loading screen and
// becomes the smallest unit of teaching in the game.
//
// Data shape mirrors data/dsl/atlas.yaml `adjacencies[].transit`. When
// the YAML loader exists, this hardcoded table will be replaced by an
// import. Until then, keeping the same shape so swap is mechanical.

const TRANSITS = {
    'glycolysis>tca-cycle': {
        enzyme: { name: 'Pyruvate Dehydrogenase', character: 'Percy' },
        from: 'Pyruvate',
        to: 'Acetyl-CoA',
        change: { lose: ['CO₂'], gain: ['CoA'], reduce: ['NAD⁺ → NADH'] },
        caption: 'Pyruvate → Acetyl-CoA',
        irrev: true,
    },
    'tca-cycle>glycolysis': {
        // No PDH reverse — gluconeogenesis goes through pyruvate carboxylase
        // → OAA → PEP. Show that path instead.
        enzyme: { name: 'Pyruvate Carboxylase + PEPCK', character: null },
        from: 'Oxaloacetate',
        to: 'Phosphoenolpyruvate',
        change: { lose: ['CO₂'], note: 'GTP spent' },
        caption: 'Out of TCA → back to glycolysis',
        irrev: false,
    },
    'tca-cycle>urea-cycle': {
        enzyme: { name: 'Glutamate Dehydrogenase', character: null },
        from: 'α-Ketoglutarate',
        to: 'Glutamate',
        change: { gain: ['NH₄⁺'], reduce: ['NADH → NAD⁺'] },
        caption: 'α-KG + NH₄⁺ → Glutamate · the nitrogen entry to the urea cycle',
        irrev: false,
    },
    'urea-cycle>tca-cycle': {
        enzyme: { name: 'Fumarase (anaplerotic)', character: null },
        from: 'Fumarate',
        to: 'Malate',
        change: { gain: ['H₂O'] },
        caption: 'Urea cycle fumarate feeds back into TCA via malate',
        irrev: false,
    },
    'tca-cycle>etc-oxphos': {
        enzyme: { name: 'NADH Dehydrogenase (Complex I)', character: null },
        from: 'NADH',
        to: 'NAD⁺',
        change: { lose: ['2H⁺', '2e⁻'], note: '4 H⁺ pumped to IMS' },
        caption: 'NADH drops electrons into Complex I',
        irrev: true,
    },
    'tca-cycle>fa-oxidation': {
        enzyme: { name: 'β-Ketothiolase', character: null },
        from: 'Fatty Acyl-CoA',
        to: '(n-2) Fatty Acyl-CoA',
        change: { gain: ['Acetyl-CoA'], note: '2 carbons fall off per spiral' },
        caption: 'β-oxidation spiral · acetyl-CoA falls off every turn',
        irrev: false,
    },
    'glycolysis>ppp': {
        enzyme: { name: 'Glucose-6-Phosphate Dehydrogenase (G6PD)', character: null },
        from: 'Glucose-6-P',
        to: '6-Phosphogluconolactone',
        change: { reduce: ['NADP⁺ → NADPH'] },
        caption: 'G6PD makes NADPH · G6PD deficiency = hemolytic anemia',
        irrev: false,
    },
};

// --- DOM scaffolding -------------------------------------------------

let transitOverlay = null;

function ensureOverlay() {
    if (transitOverlay) return transitOverlay;

    transitOverlay = document.createElement('div');
    transitOverlay.id = 'portalTransitOverlay';
    transitOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.92);
        opacity: 0; pointer-events: none;
        transition: opacity 0.35s ease;
        z-index: 10000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #f4f1e8;
    `;

    transitOverlay.innerHTML = `
        <div id="portalTransitReaction" style="
            display: flex; align-items: center; gap: 2.5rem;
            font-size: 1.6rem; font-weight: 600;
            opacity: 0; transform: translateY(8px);
            transition: opacity 0.4s ease, transform 0.4s ease;
        ">
            <span class="ptt-mol ptt-from"></span>
            <span class="ptt-arrow"></span>
            <span class="ptt-mol ptt-to"></span>
        </div>

        <div id="portalTransitChange" style="
            margin-top: 1.5rem;
            font-size: 1.05rem; color: #a8c4d8;
            min-height: 1.4rem;
            opacity: 0; transition: opacity 0.4s ease 0.2s;
        "></div>

        <div id="portalTransitCaption" style="
            margin-top: 2.5rem;
            font-size: 1.15rem; color: #f4f1e8;
            max-width: 36rem; text-align: center; line-height: 1.5;
            opacity: 0; transition: opacity 0.4s ease 0.4s;
        "></div>

        <div id="portalTransitEnzyme" style="
            margin-top: 0.7rem;
            font-size: 0.95rem; color: #ffd479; font-style: italic;
            opacity: 0; transition: opacity 0.4s ease 0.5s;
        "></div>
    `;

    document.body.appendChild(transitOverlay);

    // Style the molecule pills
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        #portalTransitOverlay .ptt-mol {
            display: inline-block;
            padding: 0.6rem 1.2rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.18);
            min-width: 7rem; text-align: center;
            transition: background 0.3s ease, transform 0.3s ease;
        }
        #portalTransitOverlay .ptt-mol.ptt-from { color: #b8d8e8; }
        #portalTransitOverlay .ptt-mol.ptt-to {
            color: #ffd479;
            background: rgba(255, 212, 121, 0.12);
            border-color: rgba(255, 212, 121, 0.35);
        }
        #portalTransitOverlay .ptt-arrow {
            font-size: 1.8rem; color: #ffd479;
        }
    `;
    document.head.appendChild(styleTag);
    return transitOverlay;
}

// --- Helpers ---------------------------------------------------------

function formatChange(change) {
    if (!change) return '';
    const parts = [];
    if (change.lose && change.lose.length) parts.push(`− ${change.lose.join(', ')}`);
    if (change.gain && change.gain.length) parts.push(`+ ${change.gain.join(', ')}`);
    if (change.reduce && change.reduce.length) parts.push(change.reduce.join(', '));
    if (change.note) parts.push(change.note);
    return parts.join('  ·  ');
}

function lookupTransit(fromWorldId, toWorldId) {
    if (!fromWorldId || !toWorldId) return null;
    return TRANSITS[`${fromWorldId}>${toWorldId}`] || null;
}

// --- Public API ------------------------------------------------------

export function hasTransit(fromWorldId, toWorldId) {
    return lookupTransit(fromWorldId, toWorldId) !== null;
}

/**
 * Play the portal-as-lesson animation. Returns a promise that resolves
 * when the animation has fully completed (overlay faded out).
 *
 * Caller should await this before/after the actual world swap. Typical
 * flow in sceneManager.transitionTo:
 *   fade-to-black → playTransit() → loadWorld() → fade-in
 */
export async function playTransit(fromWorldId, toWorldId) {
    const transit = lookupTransit(fromWorldId, toWorldId);
    if (!transit) return; // No transit data — caller falls back to plain fade

    const overlay = ensureOverlay();
    const reaction = overlay.querySelector('#portalTransitReaction');
    const fromEl = overlay.querySelector('.ptt-from');
    const toEl = overlay.querySelector('.ptt-to');
    const arrow = overlay.querySelector('.ptt-arrow');
    const changeEl = overlay.querySelector('#portalTransitChange');
    const captionEl = overlay.querySelector('#portalTransitCaption');
    const enzymeEl = overlay.querySelector('#portalTransitEnzyme');

    // Populate
    fromEl.textContent = transit.from;
    toEl.textContent = transit.to;
    arrow.textContent = transit.irrev ? '⟶' : '⇌';
    changeEl.textContent = formatChange(transit.change);
    captionEl.textContent = transit.caption || '';
    enzymeEl.textContent = transit.enzyme?.character
        ? `${transit.enzyme.name}  ·  ${transit.enzyme.character}`
        : transit.enzyme?.name || '';

    // Reset states
    [reaction, changeEl, captionEl, enzymeEl].forEach(el => {
        el.style.opacity = '0';
        if (el === reaction) el.style.transform = 'translateY(8px)';
    });

    // Show overlay
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';

    // Stagger reveal: substrate+arrow+product → change → caption → enzyme
    await new Promise(r => setTimeout(r, 50));
    reaction.style.opacity = '1';
    reaction.style.transform = 'translateY(0)';
    changeEl.style.opacity = '1';
    captionEl.style.opacity = '1';
    enzymeEl.style.opacity = '1';

    // Hold beat: long enough to read the caption.
    await new Promise(r => setTimeout(r, 1800));

    // Fade out
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    await new Promise(r => setTimeout(r, 400));
}
