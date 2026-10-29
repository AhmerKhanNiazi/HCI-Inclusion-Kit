/**
 * @file acousticEngine.js
 * @description InclusionKit Procedural Acoustic Sensory Engine.
 * Synthesizes procedural tactile click ticks, pleasant chimes, confirmation tones,
 * and gentle acoustic masking noise (Rain / White noise) using the native Web Audio API
 * (AudioContext / webkitAudioContext) with zero external audio assets.
 *
 * Namespace: window.InclusionKit.AcousticEngine
 *
 * @module AcousticEngine
 */

(function () {
  'use strict';

  window.InclusionKit = window.InclusionKit || {};

  class AcousticEngine {
    constructor() {
      /** @type {AudioContext|null} */
      this.ctx = null;
      /** @type {boolean} */
      this.isMaskingActive = false;
      /** @type {AudioBufferSourceNode|null} */
      this.rainSource = null;
      /** @type {GainNode|null} */
      this.rainGain = null;

      // Defer DOM binds
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initDom());
      } else {
        this.initDom();
      }
    }

    /**
     * Lazily initialize AudioContext on user interaction to comply with browser autoplay policy.
     * @returns {AudioContext|null}
     */
    ensureContext() {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    }

    /**
     * Helper to verify if sound is permitted in State.
     * @returns {boolean}
     */
    isAudioEnabled() {
      const State = window.InclusionKit.State;
      if (State && typeof State.get === 'function') {
        return State.get('hapticSound') !== false;
      }
      return true;
    }

    /**
     * Play crisp 12ms mechanical switch click.
     */
    playClick() {
      if (!this.isAudioEnabled()) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.016);
      } catch (e) {
        console.warn('[AcousticEngine] playClick error', e);
      }
    }

    /**
     * Play pleasant 3-note ascending chime (C5 -> E5 -> G5, ~180ms each).
     */
    playChime() {
      if (!this.isAudioEnabled()) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      try {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        const now = ctx.currentTime;

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.12;
          const dur = 0.22;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.09, start + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + dur + 0.02);
        });
      } catch (e) {
        console.warn('[AcousticEngine] playChime error', e);
      }
    }

    /**
     * Upward two-tone confirmation sound (440Hz -> 660Hz).
     */
    playConfirm() {
      if (!this.isAudioEnabled()) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const notes = [440, 660];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.09;
          const dur = 0.14;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.08, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + dur + 0.01);
        });
      } catch (e) {
        console.warn('[AcousticEngine] playConfirm error', e);
      }
    }

    /**
     * Downward error buzz (200Hz -> 80Hz).
     */
    playError() {
      if (!this.isAudioEnabled()) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {
        console.warn('[AcousticEngine] playError error', e);
      }
    }

    /**
     * Brief white noise whoosh (bandpass 800Hz).
     */
    playWhoosh() {
      if (!this.isAudioEnabled()) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      try {
        const bufferSize = ctx.sampleRate * 0.12;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 1.5;

        const gain = ctx.createGain();
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
      } catch (e) {
        console.warn('[AcousticEngine] playWhoosh error', e);
      }
    }

    /**
     * Procedural acoustic masking (Gentle Rain / Pink-ish noise).
     * Helps users with ADHD, sensory sensitivity, or cognitive distraction focus.
     */
    startRainNoise() {
      const ctx = this.ensureContext();
      if (!ctx) return;

      if (this.isMaskingActive) return;

      try {
        const bufferSize = ctx.sampleRate * 4; // 4 seconds looped
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 450;

        const gain = ctx.createGain();
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.035, now + 1.2);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start(0);

        this.rainSource = source;
        this.rainGain = gain;
        this.isMaskingActive = true;
        this.updateMaskingButtonState(true);
      } catch (e) {
        console.warn('[AcousticEngine] startRainNoise error', e);
      }
    }

    /**
     * Stop procedural masking sound.
     */
    stopRainNoise() {
      if (!this.isMaskingActive || !this.rainGain || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, now);
        this.rainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

        const oldSource = this.rainSource;
        setTimeout(() => {
          try {
            oldSource?.stop();
            oldSource?.disconnect();
          } catch (_) {}
        }, 550);

        this.rainSource = null;
        this.rainGain = null;
        this.isMaskingActive = false;
        this.updateMaskingButtonState(false);
      } catch (e) {
        console.warn('[AcousticEngine] stopRainNoise error', e);
      }
    }

    /**
     * Toggle acoustic masking noise on/off.
     */
    toggleMaskingNoise() {
      if (this.isMaskingActive) {
        this.stopRainNoise();
        const State = window.InclusionKit.State;
        if (State) State.announce('Acoustic masking sound stopped.');
        if (window.InclusionKit.VoiceEngine && typeof window.InclusionKit.VoiceEngine.speak === 'function') {
          window.InclusionKit.VoiceEngine.speak('Acoustic masking stopped');
        }
      } else {
        this.startRainNoise();
        const State = window.InclusionKit.State;
        if (State) State.announce('Gentle acoustic masking noise started.');
        if (window.InclusionKit.VoiceEngine && typeof window.InclusionKit.VoiceEngine.speak === 'function') {
          window.InclusionKit.VoiceEngine.speak('Acoustic masking noise started');
        }
      }
    }

    /**
     * Update button state in toolbar if present.
     * @param {boolean} active
     */
    updateMaskingButtonState(active) {
      const btn = document.getElementById('btn-masking-noise');
      if (btn) {
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.classList.toggle('bg-sky-600', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('bg-slate-100', !active);
        btn.classList.toggle('text-slate-700', !active);
      }
    }

    /**
     * Initialize DOM listener for masking buttons.
     */
    initDom() {
      const btn = document.getElementById('btn-masking-noise');
      if (btn) {
        btn.addEventListener('click', () => this.toggleMaskingNoise());
      }
    }
  }

  // Export singleton on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.InclusionKit.AcousticEngine = new AcousticEngine();
    });
  } else {
    window.InclusionKit.AcousticEngine = new AcousticEngine();
  }
})();
