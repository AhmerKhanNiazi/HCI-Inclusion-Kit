/**
 * ============================================================================
 * INCLUSIONKIT - Typography & Reading Adaptability Engine
 * WCAG 2.1 Guidelines:
 * - 1.4.4 Resize Text (Level AA: 200% scaling without loss of content)
 * - 1.4.12 Text Spacing (Level AA: line height, letter & word spacing)
 * - 2.3.3 Animation from Interactions (Level AAA: Reduced Motion)
 * HCI Topic 3: Inclusive Design for Accessibility
 * ============================================================================
 */

window.InclusionKit = window.InclusionKit || {};

(function () {
  'use strict';

  const State = window.InclusionKit.State;

  class TypographyEngine {
    constructor() {
      this.root = document.documentElement;
      this.readingRulerElement = null;
      this.init();
    }

    init() {
      // Subscribe to relevant state updates
      State.subscribe('fontFamily', (font) => this.applyFont(font));
      State.subscribe('fontScale', (scale) => this.applyScale(scale));
      State.subscribe('letterSpacing', (spacing) => this.applyLetterSpacing(spacing));
      State.subscribe('lineHeight', (height) => this.applyLineHeight(height));
      State.subscribe('readingRuler', (active) => this.toggleReadingRuler(active));
      State.subscribe('reducedMotion', (active) => this.toggleReducedMotion(active));

      // Setup Reading Ruler element
      this.setupReadingRuler();

      // Apply initial values
      this.applyFont(State.get('fontFamily'));
      this.applyScale(State.get('fontScale'));
      this.applyLetterSpacing(State.get('letterSpacing'));
      this.applyLineHeight(State.get('lineHeight'));
      this.toggleReadingRuler(State.get('readingRuler'));
      this.toggleReducedMotion(State.get('reducedMotion'));
    }

    /**
     * Toggles specialized dyslexia/low-vision typography
     * @param {'default' | 'dyslexic' | 'hyperlegible'} font 
     */
    applyFont(font) {
      this.root.classList.remove('font-dyslexic', 'font-hyperlegible');
      
      if (font === 'dyslexic') {
        this.root.classList.add('font-dyslexic');
        State.announce('Font updated to OpenDyslexic. Weighted bottoms active to prevent letter inversion.');
      } else if (font === 'hyperlegible') {
        this.root.classList.add('font-hyperlegible');
        State.announce('Font updated to Atkinson Hyperlegible. Braille Institute low-vision distinction active.');
      } else {
        State.announce('Standard UI typography restored.');
      }

      this.updatePills('data-font-family', font);
    }

    /**
     * Scales text size up to 200% conforming to WCAG 1.4.4
     * @param {number} scaleFactor e.g. 1.0, 1.25, 1.5, 2.0
     */
    applyScale(scaleFactor) {
      this.root.style.setProperty('--font-scale', scaleFactor);
      State.announce(`Text scale adjusted to ${Math.round(scaleFactor * 100)} percent.`);
      this.updatePills('data-font-scale', scaleFactor.toString());
    }

    /**
     * WCAG 1.4.12: Letter Spacing adjustment to at least 0.12x font size
     * @param {'normal' | 'wide' | 'extra'} spacing 
     */
    applyLetterSpacing(spacing) {
      let spacingValue = '0px';
      let wordSpacingValue = '0px';

      if (spacing === 'wide') {
        spacingValue = '0.08em';
        wordSpacingValue = '0.16em';
        State.announce('Wide letter and word spacing enabled (WCAG 1.4.12 compliance).');
      } else if (spacing === 'extra') {
        spacingValue = '0.15em';
        wordSpacingValue = '0.28em';
        State.announce('Maximum readability letter spacing enabled.');
      } else {
        State.announce('Standard letter spacing restored.');
      }

      this.root.style.setProperty('--letter-spacing', spacingValue);
      this.root.style.setProperty('--word-spacing', wordSpacingValue);
      this.updatePills('data-letter-spacing', spacing);
    }

    /**
     * WCAG 1.4.12: Line spacing to at least 1.5x font size
     * @param {'normal' | 'relaxed' | 'loose'} height 
     */
    applyLineHeight(height) {
      let factor = 1.5;
      if (height === 'relaxed') factor = 1.8;
      if (height === 'loose') factor = 2.1;

      this.root.style.setProperty('--line-height-factor', factor);
      State.announce(`Line height adjusted to factor ${factor}.`);
      this.updatePills('data-line-height', height);
    }

    /**
     * Sets up the reading ruler tracker element that follows the user's cursor
     */
    setupReadingRuler() {
      let ruler = document.getElementById('reading-ruler');
      if (!ruler) {
        ruler = document.createElement('div');
        ruler.id = 'reading-ruler';
        ruler.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ruler);
      }
      this.readingRulerElement = ruler;

      // Mouse tracker
      window.addEventListener('mousemove', (e) => {
        if (State.get('readingRuler')) {
          this.readingRulerElement.style.top = `${e.clientY}px`;
        }
      }, { passive: true });
    }

    /**
     * Toggles the reading ruler visibility
     * @param {boolean} active 
     */
    toggleReadingRuler(active) {
      if (!this.readingRulerElement) return;
      this.readingRulerElement.style.display = active ? 'block' : 'none';
      State.announce(active ? 'Reading ruler activated. Follows cursor to prevent line skipping.' : 'Reading ruler hidden.');
      this.updateToggleState('toggle-reading-ruler', active);
    }

    /**
     * WCAG 2.3.3: Animation from Interactions (Level AAA)
     * Suppresses non-essential transitions and animations
     * @param {boolean} active 
     */
    toggleReducedMotion(active) {
      if (active) {
        this.root.classList.add('reduced-motion');
        State.announce('Reduced motion activated. All decorative micro-animations suppressed.');
      } else {
        this.root.classList.remove('reduced-motion');
        State.announce('Fluid animation mode restored.');
      }
      this.updateToggleState('toggle-reduced-motion', active);
    }

    updatePills(attribute, value) {
      const elements = document.querySelectorAll(`[${attribute}]`);
      elements.forEach(el => {
        const isMatch = el.getAttribute(attribute) === value;
        el.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        if (isMatch) {
          el.classList.add('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
        } else {
          el.classList.remove('ring-2', 'ring-sky-500', 'bg-sky-50', 'text-sky-700', 'font-bold');
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

  // Export module singleton
  window.InclusionKit.TypographyEngine = new TypographyEngine();
})();
