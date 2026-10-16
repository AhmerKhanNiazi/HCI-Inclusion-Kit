/**
 * ============================================================================
 * INCLUSIONKIT - Colorblindness & Contrast Adaptability Engine
 * WCAG 2.1 Guideline 1.4: Distinguishable (1.4.1, 1.4.3, 1.4.6, 1.4.11)
 * HCI Topic 3: Inclusive Design for Accessibility
 * ============================================================================
 * 
 * Implements hardware-accelerated SVG matrix color shifting for realistic
 * color vision deficiency (CVD) simulation, plus High Contrast Level AAA styling.
 */

window.InclusionKit = window.InclusionKit || {};

(function () {
  'use strict';

  const State = window.InclusionKit.State;

  // Educational metadata describing each filter for viva evaluation
  const FILTER_DESCRIPTIONS = {
    none: {
      name: 'Trichromacy (Standard Vision)',
      wcagNote: 'Standard rendering with full L, M, and S cone photopigments active.'
    },
    protanopia: {
      name: 'Protanopia (Red-Blind)',
      wcagNote: 'WCAG 1.4.1 Compliance: L-cone photoreceptor absence. Reds appear dark/brownish. Relies on non-color cues.'
    },
    deuteranopia: {
      name: 'Deuteranopia (Green-Blind)',
      wcagNote: 'WCAG 1.4.1 Compliance: M-cone photoreceptor absence. Most common CVD (~5% males). Red-green confusion.'
    },
    tritanopia: {
      name: 'Tritanopia (Blue-Blind)',
      wcagNote: 'WCAG 1.4.1 Compliance: S-cone photoreceptor absence. Rare (<0.01%). Blue-yellow discrimination loss.'
    },
    grayscale: {
      name: 'Achromatopsia (Monochromacy)',
      wcagNote: 'WCAG 1.4.3 & 1.4.11: Complete absence of color perception. Tests pure luminance and contrast hierarchy.'
    }
  };

  class ColorFilterEngine {
    constructor() {
      this.root = document.documentElement;
      this.init();
    }

    init() {
      // Listen to state changes
      State.subscribe('colorFilter', (newFilter) => this.applyFilter(newFilter));
      State.subscribe('contrastMode', (newContrast) => this.applyContrast(newContrast));

      // Apply initial loaded state
      this.applyFilter(State.get('colorFilter'));
      this.applyContrast(State.get('contrastMode'));
    }

    /**
     * Applies colorblindness SVG matrix filter to the root HTML document.
     * @param {'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'grayscale'} filterType 
     */
    applyFilter(filterType) {
      // Remove all active filter classes
      this.root.classList.remove(
        'filter-protanopia',
        'filter-deuteranopia',
        'filter-tritanopia',
        'filter-grayscale'
      );

      if (filterType && filterType !== 'none') {
        this.root.classList.add(`filter-${filterType}`);
        const info = FILTER_DESCRIPTIONS[filterType];
        State.announce(`Color vision simulation changed to ${info.name}. ${info.wcagNote}`);
      } else {
        State.announce('Color vision simulation disabled. Standard full color restored.');
      }

      this.updateActivePills(filterType);
    }

    /**
     * Toggles High Contrast / Inverted Mode (WCAG 1.4.3 & 1.4.6)
     * @param {'normal' | 'high' | 'inverted'} contrastMode 
     */
    applyContrast(contrastMode) {
      if (contrastMode === 'high') {
        this.root.setAttribute('data-contrast', 'high');
        State.announce('High Contrast Mode Level AAA activated. Maximum luminance ratio applied.');
      } else if (contrastMode === 'inverted') {
        this.root.setAttribute('data-contrast', 'inverted');
        State.announce('Inverted Contrast Mode activated.');
      } else {
        this.root.removeAttribute('data-contrast');
        State.announce('Standard contrast mode restored.');
      }

      this.updateContrastPills(contrastMode);
    }

    /**
     * Updates visual active states on the accessibility toolbar buttons
     */
    updateActivePills(filterType) {
      const buttons = document.querySelectorAll('[data-color-filter]');
      buttons.forEach(btn => {
        const isMatch = btn.getAttribute('data-color-filter') === filterType;
        btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        if (isMatch) {
          btn.classList.add('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
        } else {
          btn.classList.remove('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
        }
      });
    }

    updateContrastPills(contrastMode) {
      const buttons = document.querySelectorAll('[data-contrast-mode]');
      buttons.forEach(btn => {
        const isMatch = btn.getAttribute('data-contrast-mode') === contrastMode;
        btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        if (isMatch) {
          btn.classList.add('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
        } else {
          btn.classList.remove('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
        }
      });
    }

    getFilterInfo(type) {
      return FILTER_DESCRIPTIONS[type] || FILTER_DESCRIPTIONS.none;
    }
  }

  // Export module singleton — deferred to DOMContentLoaded so querySelectorAll finds real elements
  document.addEventListener('DOMContentLoaded', () => {
    window.InclusionKit.ColorFilterEngine = new ColorFilterEngine();
  });
})();
