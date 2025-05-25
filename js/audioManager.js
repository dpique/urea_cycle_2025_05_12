// js/audioManager.js

let audioContextInstance = null;
let backgroundMusic = null;
let isMusicPlaying = false;

export function getAudioContext() {
    if (!audioContextInstance) {
        audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextInstance.state === 'suspended') {
        audioContextInstance.resume();
    }
    return audioContextInstance;
}

export function createGameBoySound(type) {
    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    switch(type) {
        case 'collect':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
        case 'interact':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'success':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
    }
}

export function startBackgroundMusic(patternType = 'default') {
    if (isMusicPlaying) return;
    const audioContext = getAudioContext();

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.02;
    masterGain.connect(audioContext.destination);
    const bassOsc = audioContext.createOscillator();
    const leadOsc = audioContext.createOscillator();
    const padOsc = audioContext.createOscillator();
    bassOsc.type = 'sine'; leadOsc.type = 'sine'; padOsc.type = 'sine';
    const bassGain = audioContext.createGain();
    const leadGain = audioContext.createGain();
    const padGain = audioContext.createGain();
    bassOsc.connect(bassGain); leadOsc.connect(leadGain); padOsc.connect(padGain);
    bassGain.connect(masterGain); leadGain.connect(masterGain); padGain.connect(masterGain);
    const patterns = {
        default: [
            [ { bass: 261.63, lead: 523.25, pad: 392.00 }, { bass: 293.66, lead: 587.33, pad: 440.00 }, { bass: 329.63, lead: 659.25, pad: 493.88 }, { bass: 349.23, lead: 698.46, pad: 523.25 } ],
            [ { bass: 261.63, lead: 392.00, pad: 523.25 }, { bass: 293.66, lead: 440.00, pad: 587.33 }, { bass: 329.63, lead: 493.88, pad: 659.25 }, { bass: 349.23, lead: 523.25, pad: 698.46 } ],
            [ { bass: 392.00, lead: 523.25, pad: 659.25 }, { bass: 349.23, lead: 493.88, pad: 587.33 }, { bass: 329.63, lead: 440.00, pad: 523.25 }, { bass: 293.66, lead: 392.00, pad: 493.88 } ],
            [ { bass: 261.63, lead: 392.00, pad: 523.25 }, { bass: 293.66, lead: 440.00, pad: 587.33 }, { bass: 329.63, lead: 493.88, pad: 659.25 }, { bass: 349.23, lead: 523.25, pad: 698.46 } ],
            [ { bass: 392.00, lead: 523.25, pad: 659.25 }, { bass: 440.00, lead: 587.33, pad: 698.46 }, { bass: 493.88, lead: 659.25, pad: 783.99 }, { bass: 523.25, lead: 698.46, pad: 880.00 } ],
            [ { bass: 261.63, lead: 329.63, pad: 392.00 }, { bass: 293.66, lead: 349.23, pad: 440.00 }, { bass: 329.63, lead: 392.00, pad: 493.88 }, { bass: 349.23, lead: 440.00, pad: 523.25 } ],
            [ { bass: 392.00, lead: 493.88, pad: 587.33 }, { bass: 440.00, lead: 523.25, pad: 659.25 }, { bass: 493.88, lead: 587.33, pad: 698.46 }, { bass: 523.25, lead: 659.25, pad: 783.99 } ],
            [ { bass: 261.63, lead: 392.00, pad: 493.88 }, { bass: 293.66, lead: 440.00, pad: 523.25 }, { bass: 329.63, lead: 493.88, pad: 587.33 }, { bass: 349.23, lead: 523.25, pad: 659.25 } ],
            [ { bass: 392.00, lead: 523.25, pad: 659.25 }, { bass: 440.00, lead: 587.33, pad: 698.46 }, { bass: 493.88, lead: 659.25, pad: 783.99 }, { bass: 523.25, lead: 698.46, pad: 880.00 } ],
            [ { bass: 261.63, lead: 329.63, pad: 392.00 }, { bass: 293.66, lead: 349.23, pad: 440.00 }, { bass: 329.63, lead: 392.00, pad: 493.88 }, { bass: 349.23, lead: 440.00, pad: 523.25 } ],
            [ { bass: 392.00, lead: 493.88, pad: 587.33 }, { bass: 440.00, lead: 523.25, pad: 659.25 }, { bass: 493.88, lead: 587.33, pad: 698.46 }, { bass: 523.25, lead: 659.25, pad: 783.99 } ],
            [ { bass: 261.63, lead: 392.00, pad: 493.88 }, { bass: 293.66, lead: 440.00, pad: 523.25 }, { bass: 329.63, lead: 493.88, pad: 587.33 }, { bass: 349.23, lead: 523.25, pad: 659.25 } ],
            [ { bass: 392.00, lead: 523.25, pad: 659.25 }, { bass: 440.00, lead: 587.33, pad: 698.46 }, { bass: 493.88, lead: 659.25, pad: 783.99 }, { bass: 523.25, lead: 698.46, pad: 880.00 } ],
            [ { bass: 261.63, lead: 329.63, pad: 392.00 }, { bass: 293.66, lead: 349.23, pad: 440.00 }, { bass: 329.63, lead: 392.00, pad: 493.88 }, { bass: 349.23, lead: 440.00, pad: 523.25 } ]
        ],
        postPortal: [
            [ { bass: 392.00, lead: 587.33, pad: 783.99 }, { bass: 440.00, lead: 659.25, pad: 880.00 }, { bass: 493.88, lead: 698.46, pad: 987.77 }, { bass: 523.25, lead: 783.99, pad: 1046.50 } ],
            [ { bass: 523.25, lead: 783.99, pad: 1046.50 }, { bass: 493.88, lead: 698.46, pad: 987.77 }, { bass: 440.00, lead: 659.25, pad: 880.00 }, { bass: 392.00, lead: 587.33, pad: 783.99 } ],
            [ { bass: 392.00, lead: 587.33, pad: 783.99 }, { bass: 349.23, lead: 523.25, pad: 698.46 }, { bass: 329.63, lead: 493.88, pad: 659.25 }, { bass: 293.66, lead: 440.00, pad: 587.33 } ],
            [ { bass: 392.00, lead: 587.33, pad: 783.99 }, { bass: 440.00, lead: 659.25, pad: 880.00 }, { bass: 493.88, lead: 698.46, pad: 987.77 }, { bass: 523.25, lead: 783.99, pad: 1046.50 } ],
            [ { bass: 523.25, lead: 783.99, pad: 1046.50 }, { bass: 493.88, lead: 698.46, pad: 987.77 }, { bass: 440.00, lead: 659.25, pad: 880.00 }, { bass: 392.00, lead: 587.33, pad: 783.99 } ],
            [ { bass: 392.00, lead: 587.33, pad: 783.99 }, { bass: 349.23, lead: 523.25, pad: 698.46 }, { bass: 329.63, lead: 493.88, pad: 659.25 }, { bass: 293.66, lead: 440.00, pad: 587.33 } ]
        ]
    };

    let currentPattern = 0; let currentNote = 0; const noteDuration = 0.8;
    const selectedPatterns = patterns[patternType] || patterns.default;

    function playNextNote() {
        const pattern = selectedPatterns[currentPattern];
        const note = pattern[currentNote];

        bassOsc.frequency.setValueAtTime(note.bass, audioContext.currentTime);
        leadOsc.frequency.setValueAtTime(note.lead, audioContext.currentTime);
        padOsc.frequency.setValueAtTime(note.pad, audioContext.currentTime);

        currentNote = (currentNote + 1) % pattern.length;
        if (currentNote === 0) {
            currentPattern = (currentPattern + 1) % selectedPatterns.length;
        }
    }
    bassOsc.start(); leadOsc.start(); padOsc.start(); playNextNote();
    const interval = setInterval(playNextNote, noteDuration * 1000);
    isMusicPlaying = true;
    backgroundMusic = { interval, masterGain, bassOsc, leadOsc, padOsc };
}

export function stopBackgroundMusic() {
    if (!isMusicPlaying || !backgroundMusic) return;
    clearInterval(backgroundMusic.interval);
    backgroundMusic.bassOsc.stop();
    backgroundMusic.leadOsc.stop();
    backgroundMusic.padOsc.stop();
    backgroundMusic.masterGain.disconnect();
    isMusicPlaying = false;
    backgroundMusic = null;
}

export function playPortalCelebration() {
    const audioContext = getAudioContext();
    const masterGain = audioContext.createGain(); masterGain.gain.value = 0.1; masterGain.connect(audioContext.destination);
    const osc1 = audioContext.createOscillator(), osc2 = audioContext.createOscillator(), osc3 = audioContext.createOscillator();
    osc1.type = 'sine'; osc2.type = 'sine'; osc3.type = 'sine';
    const gain1 = audioContext.createGain(), gain2 = audioContext.createGain(), gain3 = audioContext.createGain();
    osc1.connect(gain1); osc2.connect(gain2); osc3.connect(gain3);
    gain1.connect(masterGain); gain2.connect(masterGain); gain3.connect(masterGain);
    const notes = [ { f1: 523.25, f2: 659.25, f3: 783.99 }, { f1: 587.33, f2: 698.46, f3: 880.00 }, { f1: 659.25, f2: 783.99, f3: 987.77 }, { f1: 698.46, f2: 880.00, f3: 1046.50 }, { f1: 783.99, f2: 987.77, f3: 1174.66 }, { f1: 880.00, f2: 1046.50, f3: 1318.51 } ];
    let currentNote = 0; const noteDuration = 0.15;
    function playNext() {
        if (currentNote >= notes.length) {
            osc1.stop(); osc2.stop(); osc3.stop(); masterGain.disconnect();
            setTimeout(() => { startBackgroundMusic('postPortal'); }, 500);
            return;
        }
        const note = notes[currentNote];
        osc1.frequency.setValueAtTime(note.f1, audioContext.currentTime);
        osc2.frequency.setValueAtTime(note.f2, audioContext.currentTime);
        osc3.frequency.setValueAtTime(note.f3, audioContext.currentTime);
        currentNote++; setTimeout(playNext, noteDuration * 1000);
    }
    osc1.start(); osc2.start(); osc3.start(); playNext();
}

export function playMoleculeGenerationSound() {
    const audioContext = getAudioContext();
    const masterGain = audioContext.createGain(); masterGain.gain.value = 0.15; masterGain.connect(audioContext.destination);
    const osc1 = audioContext.createOscillator(), osc2 = audioContext.createOscillator(), osc3 = audioContext.createOscillator();
    osc1.type = 'sine'; osc2.type = 'sine'; osc3.type = 'sine';
    const gain1 = audioContext.createGain(), gain2 = audioContext.createGain(), gain3 = audioContext.createGain();
    osc1.connect(gain1); osc2.connect(gain2); osc3.connect(gain3);
    gain1.connect(masterGain); gain2.connect(masterGain); gain3.connect(masterGain);
    const notes = [ { f1: 523.25, f2: 659.25, f3: 783.99 }, { f1: 587.33, f2: 698.46, f3: 880.00 }, { f1: 659.25, f2: 783.99, f3: 987.77 }, { f1: 698.46, f2: 880.00, f3: 1046.50 } ];
    let currentNote = 0; const noteDuration = 0.2;
    function playNext() {
        if (currentNote >= notes.length) {
            osc1.stop(); osc2.stop(); osc3.stop(); masterGain.disconnect(); return;
        }
        const note = notes[currentNote];
        osc1.frequency.setValueAtTime(note.f1, audioContext.currentTime);
        osc2.frequency.setValueAtTime(note.f2, audioContext.currentTime);
        osc3.frequency.setValueAtTime(note.f3, audioContext.currentTime);
        currentNote++; setTimeout(playNext, noteDuration * 1000);
    }
    osc1.start(); osc2.start(); osc3.start(); playNext();
}