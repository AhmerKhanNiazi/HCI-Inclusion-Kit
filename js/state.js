/**
 * ============================================================================
 * INCLUSIONKIT - Central Reactive State Manager & Screen Reader Announcer
 * WCAG 2.1 Guideline 4.1.2: Name, Role, Value & 4.1.3: Status Messages
 * ============================================================================
 * 
 * Provides a single source of truth for all accessibility settings across the
 * application. Supports pub/sub event subscription, localStorage persistence,
 * and live region ARIA announcements for assistive technology users.
 */

window.InclusionKit = window.InclusionKit || {};

(function () {
  'use strict';

  // Default accessibility configuration state
  const DEFAULT_STATE = {
    // Topic 3: Color & Vision Filters
    colorFilter: 'none',       // 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'grayscale'
    contrastMode: 'normal',    // 'normal' | 'high' | 'inverted'
    
    // Topic 3: Typography & Reading Adaptability (WCAG 1.4.4 & 1.4.12)
    fontFamily: 'default',     // 'default' | 'dyslexic' | 'hyperlegible'
    fontScale: 1.0,            // 1.0 | 1.25 | 1.5 | 2.0
    letterSpacing: 'normal',   // 'normal' | 'wide' (1.5px) | 'extra' (3px)
    lineHeight: 'normal',      // 'normal' (1.5) | 'relaxed' (1.8) | 'loose' (2.2)
    readingRuler: false,       // boolean
    reducedMotion: false,      // boolean (WCAG 2.3.3)

    // Topic 8: Visual Haptic & Tactile Emulation
    visualHapticsEnabled: true, // Visual micro-ripples and compression
    hapticSound: true,          // Synthetic Web Audio micro-tick confirmation
    focusStyle: 'vibrant-blue', // 'vibrant-blue' | 'high-contrast-yellow' | 'cyber-magenta' | 'pure-white'
    enhancedFocus: true,        // Pulsing focus glow
    
    // Educational Viva Mode
    inspectorActive: false      // WCAG Inspector tooltips active
  };

  class StateManager {
    constructor() {
      this.listeners = new Map();
      this.state = this.loadFromStorage();
      this.liveAnnouncer = null;
      this.initAnnouncer();
    }

    /**
     * Loads saved accessibility settings from localStorage or falls back to defaults.
     * Ensures user preferences persist across page reloads (User Autonomy principle).
     */
    loadFromStorage() {
      try {
        const saved = localStorage.getItem('inclusionkit_preferences');
        if (saved) {
          return { ...DEFAULT_STATE, ...JSON.parse(saved) };
        }
      } catch (err) {
        console.warn('[InclusionKit] Unable to read localStorage:', err);
      }
      return { ...DEFAULT_STATE };
    }

    /**
     * Persists current state back to localStorage.
     */
    saveToStorage() {
      try {
        localStorage.setItem('inclusionkit_preferences', JSON.stringify(this.state));
      } catch (err) {
        console.warn('[InclusionKit] Unable to save to localStorage:', err);
      }
    }

    /**
     * Initializes hidden ARIA live regions for screen reader status messages.
     * Complies with WCAG 4.1.3 (Status Messages - Level AA).
     */
    initAnnouncer() {
      document.addEventListener('DOMContentLoaded', () => {
        let politeRegion = document.getElementById('sr-announcer-polite');
        if (!politeRegion) {
          politeRegion = document.createElement('div');
          politeRegion.id = 'sr-announcer-polite';
          politeRegion.className = 'sr-only';
          politeRegion.setAttribute('aria-live', 'polite');
          politeRegion.setAttribute('aria-atomic', 'true');
          document.body.appendChild(politeRegion);
        }
        this.liveAnnouncer = politeRegion;
      });
    }

    /**
     * Announces a message to screen reader users without shifting keyboard focus.
     * @param {string} message - Descriptive notification text
     * @param {'polite' | 'assertive'} priority - ARIA live urgency
     */
    announce(message, priority = 'polite') {
      if (!this.liveAnnouncer) return;
      this.liveAnnouncer.setAttribute('aria-live', priority);
      // Clear and re-populate to trigger speech synthesizer re-read
      this.liveAnnouncer.textContent = '';
      setTimeout(() => {
        this.liveAnnouncer.textContent = message;
      }, 50);
    }

    /**
     * Get a specific state value
     * @param {string} key 
     */
    get(key) {
      return this.state[key];
    }

    /**
     * Update state key and notify subscribers
     * @param {string} key 
     * @param {any} value 
     * @param {boolean} persist 
     */
    set(key, value, persist = true) {
      const oldValue = this.state[key];
      if (oldValue === value) return;

      this.state[key] = value;
      if (persist) this.saveToStorage();

      this.notify(key, value, oldValue);
    }

    /**
     * Subscribe to changes for a specific key or '*' for all changes
     * @param {string} key 
     * @param {Function} callback 
     */
    subscribe(key, callback) {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, new Set());
      }
      this.listeners.get(key).add(callback);

      // Return unsubscribe function for clean lifecycle handling
      return () => {
        const callbacks = this.listeners.get(key);
        if (callbacks) callbacks.delete(callback);
      };
    }

    /**
     * Notify registered listeners of state mutation
     */
    notify(key, newValue, oldValue) {
      if (this.listeners.has(key)) {
        this.listeners.get(key).forEach(cb => cb(newValue, oldValue));
      }
      if (this.listeners.has('*')) {
        this.listeners.get('*').forEach(cb => cb(key, newValue, oldValue));
      }
    }

    /**
     * Resets all accessibility preferences to factory defaults.
     * Crucial for testing & viva demonstrations.
     */
    resetAll() {
      this.state = { ...DEFAULT_STATE };
      this.saveToStorage();
      
      // Notify all subscribers of the reset
      Object.keys(DEFAULT_STATE).forEach(key => {
        this.notify(key, this.state[key], null);
      });
      this.notify('*', null, null);
      this.announce('All accessibility settings have been reset to default.');
    }
  }

  // Export singleton instance to namespace
  window.InclusionKit.State = new StateManager();
})();
