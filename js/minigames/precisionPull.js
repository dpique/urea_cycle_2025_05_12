import { MiniGame } from '../miniGame.js';
import { showFeedback } from '../uiManager.js';

const PULL_SWEET_MIN = 0.60;
const PULL_SWEET_MAX = 0.80;

/**
 * Precision pull mini-game.
 * Player holds E to build tension; must release in the green zone (60–80%).
 * On success, fires the registered onSuccess callback (caller handles splitMolecule).
 *
 * start({ glucoseModel })
 */
export class PrecisionPullMiniGame extends MiniGame {
    constructor() {
        super();
        this._active = false;
        this._glucoseModel = null;
        this._progress = 0;
        this._failed = false;
        this._keyHeld = false;
        this._bar = null;
        this._label = null;
        this._keyDownHandler = null;
        this._keyUpHandler = null;
    }

    get isActive() {
        return this._active;
    }

    start({ glucoseModel }) {
        if (this._active) return;
        this._active = true;
        this._glucoseModel = glucoseModel;
        this._progress = 0;
        this._failed = false;
        this._keyHeld = false;

        // Build overlay
        this._overlay = document.createElement('div');
        this._overlay.id = 'pullOverlay';
        this._overlay.style.cssText = `
            position: fixed; bottom: 30%; left: 50%; transform: translateX(-50%);
            width: 400px; padding: 20px; text-align: center; z-index: 1000;
            background: rgba(0,0,0,0.85); border: 2px solid #ff6600; border-radius: 12px;
            font-family: 'Segoe UI', sans-serif; color: white;
        `;

        this._label = document.createElement('div');
        this._label.style.cssText = 'font-size: 22px; font-weight: bold; margin-bottom: 12px; color: #ff8800;';
        this._label.textContent = 'HOLD E TO PULL — release in the green zone!';
        this._overlay.appendChild(this._label);

        // Bar container
        const barContainer = document.createElement('div');
        barContainer.style.cssText =
            'width: 100%; height: 34px; background: #333; border-radius: 6px; overflow: hidden; border: 1px solid #666; position: relative;';

        // Green sweet-spot zone indicator
        const sweetZone = document.createElement('div');
        sweetZone.style.cssText = `
            position: absolute; left: ${PULL_SWEET_MIN * 100}%; width: ${(PULL_SWEET_MAX - PULL_SWEET_MIN) * 100}%;
            height: 100%; background: rgba(0,255,80,0.25); border-left: 2px solid #00ff44; border-right: 2px solid #00ff44;
            pointer-events: none; z-index: 1;
        `;
        barContainer.appendChild(sweetZone);

        // Danger label past the sweet spot
        const dangerLabel = document.createElement('div');
        dangerLabel.style.cssText = `
            position: absolute; left: ${PULL_SWEET_MAX * 100 + 2}%; top: 50%; transform: translateY(-50%);
            font-size: 11px; color: #ff4444; pointer-events: none; z-index: 1; font-weight: bold;
        `;
        dangerLabel.textContent = 'TOO HARD!';
        barContainer.appendChild(dangerLabel);

        this._bar = document.createElement('div');
        this._bar.style.cssText =
            'width: 0%; height: 100%; background: linear-gradient(90deg, #ff4400, #ff8800, #ffcc00); border-radius: 4px; position: relative; z-index: 2;';
        barContainer.appendChild(this._bar);
        this._overlay.appendChild(barContainer);

        const hint = document.createElement('div');
        hint.style.cssText = 'font-size: 13px; color: #aaa; margin-top: 8px;';
        hint.textContent = 'Pull with just the right force — release E in the green zone!';
        this._overlay.appendChild(hint);

        document.body.appendChild(this._overlay);

        // Key listeners
        this._keyDownHandler = (e) => {
            if (e.key.toLowerCase() === 'e') {
                e.preventDefault();
                this._keyHeld = true;
            }
        };
        this._keyUpHandler = (e) => {
            if (e.key.toLowerCase() === 'e') {
                this._keyHeld = false;
                if (this._active && !this._failed) {
                    if (this._progress >= PULL_SWEET_MIN && this._progress <= PULL_SWEET_MAX) {
                        this._complete();
                    } else if (this._progress > 0.05) {
                        this._failed = true;
                        if (this._progress < PULL_SWEET_MIN) {
                            showFeedback('Not enough force! Hold E longer — aim for the green zone.', 2000);
                        }
                    }
                }
            }
        };
        document.addEventListener('keydown', this._keyDownHandler);
        document.addEventListener('keyup', this._keyUpHandler);
    }

    update(delta) {
        if (!this._active) return;

        // Failed state: snap back then reset for another attempt
        if (this._failed) {
            this._progress = Math.max(this._progress - delta * 2.0, 0);
            this._applyStretch();
            if (this._bar) this._bar.style.width = `${this._progress * 100}%`;
            if (this._progress <= 0) {
                this._failed = false;
                if (this._label) {
                    this._label.textContent = 'Try again — HOLD E, release in the green zone!';
                    this._label.style.color = '#ff8800';
                }
            }
            return;
        }

        if (this._keyHeld) {
            this._progress = Math.min(this._progress + delta * 0.55, 1);
            this._applyStretch();
            this._applyEmissive();

            // Creaking sounds at key tension points
            if (this._progress > 0.3 && this._progress < 0.32) {
                import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(150, 0.1, 'sawtooth'));
            }
            if (this._progress > 0.6 && this._progress < 0.62) {
                import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(120, 0.15, 'sawtooth'));
            }

            // Overshot past sweet spot
            if (this._progress > PULL_SWEET_MAX) {
                this._failed = true;
                this._keyHeld = false;
                showFeedback('Too hard! The molecule snapped back. Try again with less force.', 2000);
                import('../audioManager.js').then(({ createGameBoySound }) => createGameBoySound(80, 0.2, 'square'));
                if (this._label) {
                    this._label.textContent = 'SNAPPED BACK! Too much force!';
                    this._label.style.color = '#ff4444';
                }
                return;
            }
        } else if (this._progress > 0) {
            // Slowly relax when not holding
            this._progress = Math.max(this._progress - delta * 0.3, 0);
            this._applyStretch();
        }

        // Update progress bar
        if (this._bar) {
            this._bar.style.width = `${this._progress * 100}%`;
            this._bar.style.background =
                this._progress >= PULL_SWEET_MIN && this._progress <= PULL_SWEET_MAX
                    ? 'linear-gradient(90deg, #ff4400, #ff8800, #00ff44)'
                    : 'linear-gradient(90deg, #ff4400, #ff8800, #ffcc00)';
        }

        // Update label text
        if (this._label && !this._failed) {
            if (this._progress >= PULL_SWEET_MIN && this._progress <= PULL_SWEET_MAX) {
                this._label.textContent = 'IN THE ZONE — RELEASE E NOW!';
                this._label.style.color = '#00ff44';
            } else if (this._progress > 0.4) {
                this._label.textContent = 'Almost to the green zone...';
                this._label.style.color = '#ffcc00';
            } else if (this._progress > 0.1) {
                this._label.textContent = 'Keep pulling...';
                this._label.style.color = '#ff8800';
            } else {
                this._label.textContent = 'HOLD E TO PULL — release in the green zone!';
                this._label.style.color = '#ff8800';
            }
        }
    }

    cleanup() {
        this._active = false;
        this._keyHeld = false;
        this._progress = 0;
        this._failed = false;
        this._bar = null;
        this._label = null;
        this._glucoseModel = null;

        if (this._keyDownHandler) {
            document.removeEventListener('keydown', this._keyDownHandler);
            this._keyDownHandler = null;
        }
        if (this._keyUpHandler) {
            document.removeEventListener('keyup', this._keyUpHandler);
            this._keyUpHandler = null;
        }

        this._removeOverlay();
    }

    // --- Private ---

    _applyStretch() {
        if (!this._glucoseModel) return;
        const stretch = 1 + this._progress * 1.2;
        const squish = 1 - this._progress * 0.3;
        this._glucoseModel.scale.set(stretch, squish, squish);
    }

    _applyEmissive() {
        if (!this._glucoseModel) return;
        this._glucoseModel.traverse(child => {
            if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
                child.material.emissiveIntensity = 0.05 + this._progress * 0.5;
            }
        });
    }

    _complete() {
        const model = this._glucoseModel;
        this.cleanup(); // removes overlay, key listeners, clears state
        if (model) model.scale.set(1, 1, 1); // reset scale before split
        this._fireSuccess();
    }
}
