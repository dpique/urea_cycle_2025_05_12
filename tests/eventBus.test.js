import { describe, it, expect, vi } from 'vitest';
import { on, off, emit, once } from '../js/eventBus.js';

describe('eventBus', () => {
    it('calls a registered listener when the event is emitted', () => {
        const cb = vi.fn();
        on('test:basic', cb);
        emit('test:basic', { value: 42 });
        expect(cb).toHaveBeenCalledOnce();
        expect(cb).toHaveBeenCalledWith({ value: 42 });
        off('test:basic', cb);
    });

    it('does not call a listener after it is removed with off()', () => {
        const cb = vi.fn();
        on('test:off', cb);
        off('test:off', cb);
        emit('test:off', {});
        expect(cb).not.toHaveBeenCalled();
    });

    it('delivers the same event to multiple subscribers', () => {
        const cb1 = vi.fn();
        const cb2 = vi.fn();
        on('test:multi', cb1);
        on('test:multi', cb2);
        emit('test:multi', 'ping');
        expect(cb1).toHaveBeenCalledWith('ping');
        expect(cb2).toHaveBeenCalledWith('ping');
        off('test:multi', cb1);
        off('test:multi', cb2);
    });

    it('does not throw when emitting an event with no listeners', () => {
        expect(() => emit('test:no-listeners', {})).not.toThrow();
    });

    it('once() fires exactly once then unsubscribes', () => {
        const cb = vi.fn();
        once('test:once', cb);
        emit('test:once', 1);
        emit('test:once', 2);
        expect(cb).toHaveBeenCalledOnce();
        expect(cb).toHaveBeenCalledWith(1);
    });
});
