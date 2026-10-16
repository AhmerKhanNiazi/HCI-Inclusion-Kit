/**
 * ============================================================================
 * INCLUSIONKIT - Visual Haptic & Tactile Emulation System
 * HCI Topic 8: Visual Haptic & Tactile Emulation
 * WCAG 2.1 Guidelines:
 * - 2.4.7 Focus Visible (Level AA)
 * - 2.4.11 Focus Appearance (Level AAA)
 * - 2.5.5 Target Size (Enhanced minimum touch bounds)
 * ============================================================================
 * 
 * Replaces missing physical haptic actuators (vibration motors) with:
 * 1. Visual micro-spring compression (tactile travel simulation)
 * 2. Visual expanding shockwave ripples (tactile wave dispersion)
 * 3. High-visibility pulsing focus indicators (WCAG 2.4.7/2.4.11)
 * 4. Screen edge recoil collision flash
 * 5. Self-contained Web Audio micro-tick dual-channel feedback (Zero mics/hardware)
 */

window.InclusionKit = window.InclusionKit || {};

(function () {
  'use strict';

  const State = window.InclusionKit.State;

  // Pre-configured high-visibility focus themes
  const FOCUS_THEMES = {
    'vibrant-blue': {
      name: 'Vibrant Blue',
      ringColor: '#0284c7',
      pulseColor: 'rgba(2, 132, 199, 0.45)',
      hex: '#0284c7'
    },
    'high-contrast-yellow': {
      name: 'High-Contrast Yellow',
      ringColor: '#facc15',
      pulseColor: 'rgba(250, 204, 21, 0.55)',
      hex: '#facc15'
    },
    'cyber-magenta': {
      name: 'Cyber Magenta',
      ringColor: '#ec4899',
      pulseColor: 'rgba(236, 72, 153, 0.45)',
      hex: '#ec4899'
    },
    'pure-white': {
      name: 'Stark White',
      ringColor: '#ffffff',
      pulseColor: 'rgba(255, 255, 255, 0.5)',
      hex: '#ffffff'
    }
  };

  class VisualHapticEngine {
    constructor() {
      this.root = document.documentElement;
      this.audioCtx = null;
      this.isKeyboardNav = false;
      this.init();
    }

    init() {
      // Subscriptions
      State.subscribe('focusStyle', (style) => this.applyFocusStyle(style));
      State.subscribe('enhancedFocus', (active) => this.applyEnhancedFocus(active));

      this.applyFocusStyle(State.get('focusStyle'));
      this.applyEnhancedFocus(State.get('enhancedFocus'));

      // Setup event listeners for keyboard navigation vs mouse detection
      this.setupNavigationModeTracker();

      // Setup universal tactile feedback delegates
      this.setupTactileListeners();
    }

    /**
     * Initializes a lightweight, synthetic Web Audio click.
     * Complies with zero-hardware requirement (synthesizes tone directly in software).
     */
    playSyntheticTick(type = 'tap') {
      if (!State.get('hapticSound')) return;

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
        }

        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'tap') {
          // Sharp, crisp mechanical micro-switch click (12ms)
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
          osc.start(now);
          osc.stop(now + 0.015);
        } else if (type === 'bump') {
          // Lower pitched tactile boundary recoil bump (30ms)
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.035);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
          osc.start(now);
          osc.stop(now + 0.035);
        }
      } catch (err) {
        // AudioContext may be blocked before first user gesture
      }
    }

    /**
     * Triggers visual spring compression and tactile ripple wave on an element
     * @param {HTMLElement} element 
     * @param {MouseEvent | KeyboardEvent} event 
     */
    triggerHapticFeedback(element, event) {
      if (!State.get('visualHapticsEnabled')) return;

      // 1. Visual Spring Compression (Topic 8: Tactile Travel Emulation)
      element.classList.remove('tactile-bump');
      // Trigger reflow to restart animation reliably
      void element.offsetWidth;
      element.classList.add('tactile-bump');

      // 2. Visual Tactile Ripple Wave
      this.createRippleWave(element, event);

      // 3. Synthetic Audio Tactile Tick
      this.playSyntheticTick('tap');
    }

    /**
     * Emulates tactile collision with a boundary (e.g. min/max limit or error)
     */
    triggerBoundaryCollision() {
      if (!State.get('visualHapticsEnabled')) return;

      const flash = document.createElement('div');
      flash.className = 'haptic-screen-flash';
      document.body.appendChild(flash);

      this.playSyntheticTick('bump');

      setTimeout(() => {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 350);
    }

    /**
     * Injects an expanding radial wave inside or around the clicked element
     */
    createRippleWave(element, event) {
      // Find positioning container
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'haptic-ripple';

      const diameter = Math.max(rect.width, rect.height) * 1.5;
      const radius = diameter / 2;

      let clientX = rect.left + rect.width / 2;
      let clientY = rect.top + rect.height / 2;

      if (event && event.clientX && event.clientY) {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${clientX - rect.left - radius}px`;
      ripple.style.top = `${clientY - rect.top - radius}px`;

      // Ensure target element can clip or show ripple
      element.classList.add('haptic-active');
      element.appendChild(ripple);

      ripple.addEventListener('animationend', () => {
        if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
      });
    }

    /**
     * Tracks whether keyboard or mouse is used (WCAG 2.1.1 Keyboard Navigation)
     */
    setupNavigationModeTracker() {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          this.isKeyboardNav = true;
          document.body.classList.add('keyboard-nav-active');
        }
      });

      window.addEventListener('mousedown', () => {
        this.isKeyboardNav = false;
        document.body.classList.remove('keyboard-nav-active');
      });
    }

    /**
     * Universal event listeners delegating tactile feedback to interactive elements
     */
    setupTactileListeners() {
      // Click / Touch delegation
      document.addEventListener('click', (e) => {
        const interactive = e.target.closest('button, [role="button"], a, input[type="radio"], input[type="checkbox"], select, .interactive-card');
        if (interactive) {
          this.triggerHapticFeedback(interactive, e);
        }
      });

      // Keyboard activation delegation (Enter / Space)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'BUTTON' || activeEl.getAttribute('role') === 'button' || activeEl.tagName === 'A')) {
            this.triggerHapticFeedback(activeEl, e);
          }
        }
      });

      // Focus transition sound & vibration indication
      document.addEventListener('focusin', (e) => {
        if (this.isKeyboardNav && State.get('visualHapticsEnabled')) {
          const target = e.target;
          if (target && target.matches('button, a, input, select, textarea, [tabindex]')) {
            target.classList.add('tactile-bump');
            setTimeout(() => target.classList.remove('tactile-bump'), 220);
          }
        }
      });
    }

    /**
     * Applies focus ring styling tokens
     * @param {string} themeKey 
     */
    applyFocusStyle(themeKey) {
      const theme = FOCUS_THEMES[themeKey] || FOCUS_THEMES['vibrant-blue'];
      this.root.style.setProperty('--focus-ring-color', theme.ringColor);
      this.root.style.setProperty('--haptic-pulse-color', theme.pulseColor);

      this.updateFocusPills(themeKey);
    }

    /**
     * Toggles pulsing focus indicators
     * @param {boolean} active 
     */
    applyEnhancedFocus(active) {
      if (active) {
        this.root.classList.add('enhanced-focus');
        State.announce('High-visibility pulsating focus indicator enabled (WCAG 2.4.11 AAA).');
      } else {
        this.root.classList.remove('enhanced-focus');
        State.announce('Standard focus indicator restored.');
      }
      this.updateToggleState('toggle-enhanced-focus', active);
    }

    updateFocusPills(themeKey) {
      const buttons = document.querySelectorAll('[data-focus-theme]');
      buttons.forEach(btn => {
        const isMatch = btn.getAttribute('data-focus-theme') === themeKey;
        btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        if (isMatch) {
          btn.classList.add('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
        } else {
          btn.classList.remove('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
        }
      });
    }

    updateToggleState(elementId, isActive) {
      const btn = document.getElementById(elementId);
      if (btn) {
        btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
        const indicator = btn.querySelector('.toggle-indicator');
        if (indicator) {
          indicator.style.transform = isActive ? 'translateX(1.25rem)' : 'translateX(0)';
          btn.classList.toggle('bg-sky-600', isActive);
          btn.classList.toggle('bg-slate-300', !isActive);
        }
      }
    }
  }

  // Export module singleton — deferred to DOMContentLoaded
  // Note: document event listeners still work fine inside, DOM queries now safe
  document.addEventListener('DOMContentLoaded', () => {
    window.InclusionKit.VisualHapticEngine = new VisualHapticEngine();
  });
})();
