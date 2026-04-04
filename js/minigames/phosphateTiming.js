import * as THREE from 'three';
import { MiniGame } from '../miniGame.js';

/**
 * Phosphate timing mini-game.
 * The glucose model spins; the player must press E when the target carbon vertex
 * faces the camera (within ~32° tolerance).
 *
 * start({ glucoseModel, targetVertex, carbonLabel, spinSpeed })
 */
export class PhosphateTimingMiniGame extends MiniGame {
    constructor() {
        super();
        this._active = false;
        this._glucoseModel = null;
        this._targetVertex = 0;
        this._keyHandler = null;
    }

    get isActive() {
        return this._active;
    }

    start({ glucoseModel, targetVertex, carbonLabel, spinSpeed }) {
        if (this._active || !glucoseModel) return;
        this._active = true;
        this._glucoseModel = glucoseModel;
        this._targetVertex = targetVertex;

        // Highlight the target carbon
        const verts = glucoseModel.userData.vertices;
        if (verts && verts[targetVertex]) {
            const highlight = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 })
            );
            highlight.position.copy(verts[targetVertex]);
            highlight.userData.isTargetHighlight = true;
            glucoseModel.add(highlight);
        }

        // Speed up the molecule's spin
        glucoseModel.userData.timingSpinSpeed = spinSpeed;

        // Build UI overlay
        this._overlay = document.createElement('div');
        this._overlay.style.cssText = `
            position: fixed; bottom: 30%; left: 50%; transform: translateX(-50%);
            width: 380px; padding: 16px; text-align: center; z-index: 1000;
            background: rgba(0,0,0,0.85); border: 2px solid #ffaa00; border-radius: 12px;
            font-family: 'Segoe UI', sans-serif; color: white;
        `;
        this._overlay.innerHTML = `
            <div style="font-size: 22px; font-weight: bold; color: #ffaa00; margin-bottom: 8px;">
                Place the phosphate on ${carbonLabel}!
            </div>
            <div style="font-size: 14px; color: #ccc; margin-bottom: 10px;">
                Watch the spinning molecule. Press <span style="color:#ffcc00;font-weight:bold;">E</span> when the
                <span style="color:#ff4444;font-weight:bold;">red target</span> faces you!
            </div>
            <div id="phosphateTimingFeedback" style="font-size: 16px; min-height: 24px;"></div>
        `;
        document.body.appendChild(this._overlay);

        // E key fires the timing check (capture phase so game loop doesn't eat it)
        this._keyHandler = (e) => {
            if (e.key.toLowerCase() === 'e' && this._active && !e.repeat) {
                e.preventDefault();
                e.stopPropagation();
                this._check();
            }
        };
        document.addEventListener('keydown', this._keyHandler, true);
    }

    update(delta) {
        if (this._active && this._glucoseModel && this._glucoseModel.userData.timingSpinSpeed) {
            this._glucoseModel.rotation.y += this._glucoseModel.userData.timingSpinSpeed * delta;
        }
    }

    cleanup() {
        this._active = false;

        // Remove highlight sphere and clear spin speed
        if (this._glucoseModel) {
            const highlights = [];
            this._glucoseModel.traverse(c => {
                if (c.userData && c.userData.isTargetHighlight) highlights.push(c);
            });
            highlights.forEach(h => this._glucoseModel.remove(h));
            this._glucoseModel.userData.timingSpinSpeed = null;
            this._glucoseModel = null;
        }

        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler, true);
            this._keyHandler = null;
        }

        this._removeOverlay();
    }

    _check() {
        if (!this._glucoseModel || !this._active) return;

        const verts = this._glucoseModel.userData.vertices;
        if (!verts || !verts[this._targetVertex]) return;

        const targetLocal = verts[this._targetVertex].clone();
        targetLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), this._glucoseModel.rotation.y);

        // "Facing you" = most positive Z (toward camera in default view)
        const angle = Math.atan2(targetLocal.x, targetLocal.z);
        const tolerance = 0.55; // ~32° either side

        const feedbackEl = document.getElementById('phosphateTimingFeedback');

        if (Math.abs(angle) < tolerance) {
            // HIT — tear down first so key events stop, then fire success
            this.cleanup();
            this._fireSuccess();
        } else {
            // MISS
            if (feedbackEl) {
                feedbackEl.textContent = 'Missed! Wait for the red target to face you...';
                feedbackEl.style.color = '#ff6666';
                setTimeout(() => { if (feedbackEl) feedbackEl.textContent = ''; }, 1200);
            }
            import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(100, 0.1, 'square'));
        }
    }
}
