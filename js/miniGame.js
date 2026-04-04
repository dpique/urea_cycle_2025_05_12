/**
 * Base class for modal mini-games.
 * Subclasses implement start(config), update(delta), and cleanup().
 * Register outcome callbacks with onSuccess(cb) / onFail(cb) before calling start().
 */
export class MiniGame {
    constructor() {
        this._overlay = null;
        this._successCb = null;
        this._failCb = null;
    }

    /** Register a success callback. Returns `this` for chaining. */
    onSuccess(cb) {
        this._successCb = cb;
        return this;
    }

    /** Register a failure callback. Returns `this` for chaining. */
    onFail(cb) {
        this._failCb = cb;
        return this;
    }

    /** Start the mini-game with the given config object. */
    start(_config) {}

    /** Called each frame while the mini-game is active. */
    update(_delta, _elapsedTime) {}

    /** Tear down DOM, event listeners, and state. Must be safe to call multiple times. */
    cleanup() {
        this._removeOverlay();
    }

    // --- Protected helpers ---

    _removeOverlay() {
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
        this._overlay = null;
    }

    _fireSuccess(data) {
        if (this._successCb) this._successCb(data);
    }

    _fireFail(data) {
        if (this._failCb) this._failCb(data);
    }
}
