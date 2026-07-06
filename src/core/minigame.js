// src/core/minigame.js
// Two small, satisfying skill games used for the key reactions. Both are DOM overlays
// that block gameplay while active (engine checks isActive()) and resolve a Promise with
// success/failure. They own their own key listeners so they never fight global input.
//
//   timing(): a marker sweeps a bar; hit E/Space/click inside the green zone. Used for
//             strapping a phosphate onto a specific carbon (phosphorylation, launches).
//   hold():   hold E to build tension, release inside the green zone. Used for pulling a
//             bond apart (aldolase split).

import { css } from '../art/palette.js';

let active = false;
export function isActive() {
  return active;
}

function overlay() {
  const el = document.getElementById('minigame');
  el.hidden = false;
  active = true;
  return el;
}
function done(el) {
  active = false;
  el.hidden = true;
  el.innerHTML = '';
}

// opts: { title, hint, color, speed (0..1 per sec), zone [start,end] in 0..1, tries }
export function timing(opts = {}) {
  const { title = 'Line it up', hint = 'Press E in the green zone', color = 0xffcf3f } = opts;
  const speed = opts.speed ?? 0.85;
  const zone = opts.zone ?? [0.42, 0.62];
  const el = overlay();
  el.innerHTML = `
    <div class="mg-box" style="--accent:${css(color)}">
      <div class="mg-title">${title}</div>
      <div class="mg-hint">${hint}</div>
      <div class="mg-bar">
        <div class="mg-zone"></div>
        <div class="mg-marker"></div>
      </div>
      <div class="mg-foot">E / Space / click</div>
    </div>`;
  const zoneEl = el.querySelector('.mg-zone');
  const marker = el.querySelector('.mg-marker');
  zoneEl.style.left = zone[0] * 100 + '%';
  zoneEl.style.width = (zone[1] - zone[0]) * 100 + '%';

  return new Promise((resolve) => {
    let pos = 0;
    let dir = 1;
    let raf = 0;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pos += dir * speed * dt;
      if (pos >= 1) {
        pos = 1;
        dir = -1;
      } else if (pos <= 0) {
        pos = 0;
        dir = 1;
      }
      marker.style.left = pos * 100 + '%';
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const finish = () => {
      cancelAnimationFrame(raf);
      const ok = pos >= zone[0] && pos <= zone[1];
      marker.classList.add(ok ? 'hit' : 'miss');
      cleanup();
      setTimeout(() => {
        done(el);
        resolve(ok);
      }, 450);
    };
    const onKey = (e) => {
      if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    const onClick = () => finish();
    const cleanup = () => {
      window.removeEventListener('keydown', onKey);
      el.removeEventListener('click', onClick);
    };
    window.addEventListener('keydown', onKey);
    el.addEventListener('click', onClick);
  });
}

// opts: { title, hint, color, fillRate (0..1 per sec), zone [start,end], decay }
export function hold(opts = {}) {
  const { title = 'Pull it apart', hint = 'Hold E, release in the green zone', color = 0x9b5de5 } = opts;
  const fillRate = opts.fillRate ?? 0.7;
  const zone = opts.zone ?? [0.62, 0.86];
  const el = overlay();
  el.innerHTML = `
    <div class="mg-box" style="--accent:${css(color)}">
      <div class="mg-title">${title}</div>
      <div class="mg-hint">${hint}</div>
      <div class="mg-bar vertical">
        <div class="mg-zone"></div>
        <div class="mg-fill"></div>
      </div>
      <div class="mg-foot">hold E, release to pull</div>
    </div>`;
  const zoneEl = el.querySelector('.mg-zone');
  const fill = el.querySelector('.mg-fill');
  zoneEl.style.bottom = zone[0] * 100 + '%';
  zoneEl.style.height = (zone[1] - zone[0]) * 100 + '%';

  return new Promise((resolve) => {
    let val = 0;
    let holding = false;
    let raf = 0;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (holding) val = Math.min(1, val + fillRate * dt);
      else val = Math.max(0, val - (opts.decay ?? 0.4) * dt);
      fill.style.height = val * 100 + '%';
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const release = () => {
      if (!holding) return;
      holding = false;
      cancelAnimationFrame(raf);
      const ok = val >= zone[0] && val <= zone[1];
      fill.classList.add(ok ? 'hit' : 'miss');
      cleanup();
      setTimeout(() => {
        done(el);
        resolve(ok);
      }, 450);
    };
    const onDown = (e) => {
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        holding = true;
      }
    };
    const onUp = (e) => {
      if (e.key === 'e' || e.key === 'E') release();
    };
    const onPointerDown = () => (holding = true);
    const onPointerUp = () => release();
    const cleanup = () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
  });
}
