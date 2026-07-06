// src/core/dialogue.js
// RSC-style dialogue: one or two short lines per screen, click to advance, optional
// choice buttons at the end. Also hosts the end-of-world "Reality Check" — a short
// board-caliber quiz, one question per screen with an explanation after each answer.
// While a dialogue or quiz is open the engine freezes gameplay (isBlocking()).

import { css } from '../art/palette.js';

let rootEl, open = false;

export function initDialogue() {
  rootEl = document.getElementById('dialogue');
  rootEl.hidden = true;
}

export function isBlocking() {
  return open;
}

function close() {
  open = false;
  rootEl.hidden = true;
  rootEl.innerHTML = '';
}

// show({ speaker, color, lines:[...], choices:[{text, action}] })
export function show(opts) {
  const { speaker = '', color = 0x6cc0c0, lines = [''], choices = null, onClose } = opts;
  open = true;
  rootEl.hidden = false;
  let i = 0;

  const render = () => {
    const isLast = i >= lines.length - 1;
    const btns = isLast
      ? (choices || [{ text: 'Continue', action: null }])
      : [{ text: '. . .', action: '__next__' }];
    rootEl.innerHTML = `
      <div class="dlg-box" style="--accent:${css(color)}">
        <div class="dlg-speaker"><span class="dlg-portrait"></span>${speaker}</div>
        <div class="dlg-line">${lines[i]}</div>
        <div class="dlg-choices">
          ${btns.map((b, bi) => `<button class="dlg-btn" data-i="${bi}">${b.text}</button>`).join('')}
        </div>
      </div>`;
    rootEl.querySelectorAll('.dlg-btn').forEach((el, bi) => {
      el.onclick = () => {
        const b = btns[bi];
        if (b.action === '__next__') {
          i++;
          render();
        } else {
          const act = b.action;
          close();
          if (act) act();
          if (onClose) onClose();
        }
      };
    });
  };
  render();
}

// A one-line non-blocking style helper is in hud.toast; this is only blocking dialogue.

// quiz({ title, color, questions:[{ q, options:[...], answer, explain }], onPass, onComplete, passMark })
export function quiz(opts) {
  const { title = 'Reality Check', color = 0xffcf3f, questions = [], onComplete, passMark = 0.7 } = opts;
  open = true;
  rootEl.hidden = false;
  let qi = 0;
  let correct = 0;

  const intro = () => {
    rootEl.innerHTML = `
      <div class="dlg-box quiz" style="--accent:${css(color)}">
        <div class="dlg-speaker">${title}</div>
        <div class="dlg-line">${questions.length} questions. Answer to prove you understand the pathway.</div>
        <div class="dlg-choices"><button class="dlg-btn" id="quiz-start">Begin</button></div>
      </div>`;
    document.getElementById('quiz-start').onclick = ask;
  };

  const ask = () => {
    const q = questions[qi];
    rootEl.innerHTML = `
      <div class="dlg-box quiz" style="--accent:${css(color)}">
        <div class="dlg-speaker">${title} — ${qi + 1}/${questions.length}</div>
        <div class="dlg-line">${q.q}</div>
        <div class="quiz-options">
          ${q.options.map((o, oi) => `<button class="quiz-opt" data-i="${oi}">${o}</button>`).join('')}
        </div>
      </div>`;
    rootEl.querySelectorAll('.quiz-opt').forEach((el, oi) => {
      el.onclick = () => grade(oi);
    });
  };

  const grade = (choice) => {
    const q = questions[qi];
    const right = choice === q.answer;
    if (right) correct++;
    rootEl.querySelectorAll('.quiz-opt').forEach((el, oi) => {
      el.disabled = true;
      if (oi === q.answer) el.classList.add('correct');
      else if (oi === choice) el.classList.add('wrong');
    });
    const feedback = document.createElement('div');
    feedback.className = 'quiz-explain';
    feedback.innerHTML = `<b>${right ? 'Correct.' : 'Not quite.'}</b> ${q.explain}
      <button class="dlg-btn" id="quiz-next">${qi < questions.length - 1 ? 'Next' : 'See result'}</button>`;
    rootEl.querySelector('.dlg-box').appendChild(feedback);
    document.getElementById('quiz-next').onclick = () => {
      qi++;
      if (qi < questions.length) ask();
      else finish();
    };
  };

  const finish = () => {
    const score = questions.length ? correct / questions.length : 1;
    const passed = score >= passMark;
    rootEl.innerHTML = `
      <div class="dlg-box quiz" style="--accent:${css(color)}">
        <div class="dlg-speaker">${title} — Result</div>
        <div class="dlg-line">You scored ${correct}/${questions.length}. ${passed ? 'The pathway is yours.' : 'Review the stations and try again.'}</div>
        <div class="dlg-choices"><button class="dlg-btn" id="quiz-done">${passed ? 'Claim reward' : 'Close'}</button></div>
      </div>`;
    document.getElementById('quiz-done').onclick = () => {
      close();
      if (onComplete) onComplete({ score, correct, total: questions.length, passed });
    };
  };

  intro();
}
