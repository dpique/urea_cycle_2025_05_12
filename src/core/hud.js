// src/core/hud.js
// The heads-up display. Builds its own DOM into #hud so index.html stays minimal. Shows
// the purpose gauge (a pathway's reason to exist), the persistent shared-economy chips,
// the live pathway diagram, the current objective, the carried-molecule name, and toasts.

import * as economy from './economy.js';
import { CURRENCY, css } from '../art/palette.js';

let root, gaugeEl, objectiveEl, currencyEl, promptEl, toastStack, pathwayEl, carriedEl, bannerEl;

export function initHud() {
  root = document.getElementById('hud');
  root.innerHTML = `
    <div class="hud-tl">
      <div class="gauge" id="hud-gauge" hidden>
        <div class="gauge-label"><span class="gauge-name"></span><span class="gauge-val"></span></div>
        <div class="gauge-track"><div class="gauge-fill"></div></div>
      </div>
      <div class="objective" id="hud-objective" hidden>
        <span class="obj-dot"></span><span class="obj-text"></span>
      </div>
    </div>
    <div class="hud-tr"><div class="currencies" id="hud-currencies"></div></div>
    <div class="pathway" id="hud-pathway" hidden></div>
    <div class="carried" id="hud-carried" hidden><span class="carried-cap">carrying</span><span class="carried-name"></span></div>
    <div class="prompt" id="hud-prompt" hidden></div>
    <div class="toast-stack" id="hud-toasts"></div>
    <div class="banner" id="hud-banner" hidden><div class="banner-title"></div><div class="banner-sub"></div></div>
  `;
  gaugeEl = document.getElementById('hud-gauge');
  objectiveEl = document.getElementById('hud-objective');
  currencyEl = document.getElementById('hud-currencies');
  promptEl = document.getElementById('hud-prompt');
  toastStack = document.getElementById('hud-toasts');
  pathwayEl = document.getElementById('hud-pathway');
  carriedEl = document.getElementById('hud-carried');
  bannerEl = document.getElementById('hud-banner');

  economy.on('change', renderCurrencies);
  economy.on('gain', ({ name }) => flashChip(name, 'gain'));
  economy.on('spend', ({ name }) => flashChip(name, 'spend'));
  renderCurrencies(economy.snapshot());
}

// --- interact prompt ---
export function setInteractPrompt(text) {
  if (!promptEl) return;
  if (text) {
    promptEl.textContent = text;
    promptEl.hidden = false;
  } else {
    promptEl.hidden = true;
  }
}

// --- toasts (short feedback) ---
export function toast(text, ms = 3200, kind = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = text;
  toastStack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, ms);
}

// --- objective ---
export function setObjective(text) {
  if (!objectiveEl) return;
  if (text) {
    objectiveEl.querySelector('.obj-text').textContent = text;
    objectiveEl.hidden = false;
  } else {
    objectiveEl.hidden = true;
  }
}

// --- purpose gauge ---
// opts: { name, value 0..1, color (hex int), danger: 'high'|'low' }
export function setGauge(opts) {
  if (!gaugeEl) return;
  if (!opts) {
    gaugeEl.hidden = true;
    return;
  }
  gaugeEl.hidden = false;
  gaugeEl.querySelector('.gauge-name').textContent = opts.name;
  const pct = Math.max(0, Math.min(1, opts.value)) * 100;
  const fill = gaugeEl.querySelector('.gauge-fill');
  fill.style.width = pct.toFixed(0) + '%';
  fill.style.background = css(opts.color);
  gaugeEl.querySelector('.gauge-val').textContent = opts.text ?? pct.toFixed(0) + '%';
  // danger pulse when a "bad" gauge (toxicity) climbs high
  const bad = opts.danger === 'high' ? pct > 55 : opts.danger === 'low' ? pct < 25 : false;
  gaugeEl.classList.toggle('danger', bad);
}

// --- persistent shared economy chips ---
function renderCurrencies(snap) {
  if (!currencyEl) return;
  const parts = economy.CURRENCY_ORDER.map((name) => {
    const n = snap.currencies[name] || 0;
    return `<div class="chip" data-cur="${name}" style="--c:${css(CURRENCY[name] || 0xffffff)}">
      <span class="chip-dot"></span><span class="chip-name">${name}</span><span class="chip-n">${n}</span>
    </div>`;
  });
  currencyEl.innerHTML = parts.join('');
}
function flashChip(name, kind) {
  const chip = currencyEl?.querySelector(`.chip[data-cur="${name}"]`);
  if (!chip) return;
  chip.classList.remove('flash-gain', 'flash-spend');
  void chip.offsetWidth; // restart animation
  chip.classList.add(kind === 'spend' ? 'flash-spend' : 'flash-gain');
}

// --- pathway diagram ---
// steps: [{ label, sub }], currentIndex, doneCount
export function setPathway(steps, currentIndex = 0) {
  if (!pathwayEl) return;
  if (!steps || !steps.length) {
    pathwayEl.hidden = true;
    return;
  }
  pathwayEl.hidden = false;
  pathwayEl.innerHTML = steps
    .map((s, i) => {
      const cls = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'todo';
      return `<div class="pw-node ${cls}"><span class="pw-dot">${i < currentIndex ? '✓' : i + 1}</span><span class="pw-label">${s.label}</span></div>`;
    })
    .join('<span class="pw-link"></span>');
}
export function updatePathway(steps, currentIndex) {
  setPathway(steps, currentIndex);
}

// --- carried molecule name ---
export function setCarried(name) {
  if (!carriedEl) return;
  if (name) {
    carriedEl.querySelector('.carried-name').textContent = name;
    carriedEl.hidden = false;
  } else {
    carriedEl.hidden = true;
  }
}

// --- world banner ---
export function banner(title, sub = '') {
  if (!bannerEl) return;
  bannerEl.querySelector('.banner-title').textContent = title;
  bannerEl.querySelector('.banner-sub').textContent = sub;
  bannerEl.hidden = false;
  bannerEl.classList.remove('show');
  void bannerEl.offsetWidth;
  bannerEl.classList.add('show');
  setTimeout(() => bannerEl.classList.remove('show'), 3600);
  setTimeout(() => (bannerEl.hidden = true), 4200);
}

// Reset transient world HUD (called on world switch).
export function resetWorldHud() {
  setGauge(null);
  setObjective(null);
  setPathway(null);
  setCarried(null);
  setInteractPrompt(null);
}
