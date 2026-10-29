/**
 * ============================================================================
 * INCLUSIONKIT - Main Application Orchestrator & Adaptability Dock Controller
 * ============================================================================
 * 
 * Binds UI controls in the Floating Expandable Accessibility Dock to the
 * State Manager and modules. Manages keyboard shortcuts, active badges, and
 * viva documentation modals.
 */

window.InclusionKit = window.InclusionKit || {};

(function () {
  'use strict';

  const State = window.InclusionKit.State;
  // Lazy getters — these modules are initialized in their own DOMContentLoaded handlers
  const Haptics = () => window.InclusionKit.VisualHapticEngine;
  const Inspector = () => window.InclusionKit.WCAGInspector;

  class AppController {
    constructor() {
      this.dock = null;
      this.dockToggleBtn = null;
      this.isDockOpen = false;
      this.init();
    }

    init() {
      document.addEventListener('DOMContentLoaded', () => {
        this.cacheDomElements();
        this.bindDockToggle();
        this.bindDockTabs();
        this.bindVisionControls();
        this.bindTypographyControls();
        this.bindHapticControls();
        this.bindInspectorAndVivaModals();
        this.bindKeyboardShortcuts();
        this.bindResetButton();
        this.updateActiveBadgeCounter();

        // Subscribe to any state change to update the active badge counter
        State.subscribe('*', () => this.updateActiveBadgeCounter());

        console.log('%c InclusionKit Initialized %c HCI Topics 3 & 8 Ready ', 
          'background: #0284c7; color: #fff; font-weight: bold; border-radius: 4px; padding: 2px 6px;',
          'background: #0f172a; color: #38bdf8; font-weight: bold; border-radius: 4px; padding: 2px 6px;'
        );
      });
    }

    cacheDomElements() {
      this.dock = document.getElementById('accessibility-dock');
      this.dockToggleBtn = document.getElementById('btn-toggle-dock');
    }

    /**
     * Floating Accessibility Dock (The Adaptability Engine) Toggle
     */
    bindDockToggle() {
      if (!this.dockToggleBtn || !this.dock) return;

      const toggleDock = (open) => {
        this.isDockOpen = typeof open === 'boolean' ? open : !this.isDockOpen;

        this.dock.classList.toggle('translate-x-full', !this.isDockOpen);
        this.dock.classList.toggle('opacity-0', !this.isDockOpen);
        this.dock.classList.toggle('pointer-events-none', !this.isDockOpen);
        this.dockToggleBtn.setAttribute('aria-expanded', this.isDockOpen ? 'true' : 'false');

        if (this.isDockOpen) {
          // Focus first focusable element inside dock
          const firstFocusable = this.dock.querySelector('button, [tabindex="0"]');
          if (firstFocusable) firstFocusable.focus();
          State.announce('Accessibility control panel opened.');
        } else {
          this.dockToggleBtn.focus();
          State.announce('Accessibility control panel closed.');
        }
      };

      this.dockToggleBtn.addEventListener('click', () => toggleDock());

      // Close button inside dock
      const closeBtn = document.getElementById('btn-close-dock');
      if (closeBtn) closeBtn.addEventListener('click', () => toggleDock(false));

      // Close with Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isDockOpen) {
          toggleDock(false);
        }
      });

      // WCAG 2.1.2 Focus Trap inside dock when open
      this.dock.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || !this.isDockOpen) return;
        const focusables = Array.from(this.dock.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter(el => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
    }

    /**
     * Tab navigation inside the floating dock
     */
    bindDockTabs() {
      const tabs = document.querySelectorAll('[data-dock-tab]');
      const sections = document.querySelectorAll('[data-dock-section]');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetSection = tab.getAttribute('data-dock-tab');

          tabs.forEach(t => {
            const isMatch = t === tab;
            t.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            t.classList.toggle('border-sky-600', isMatch);
            t.classList.toggle('text-sky-600', isMatch);
            t.classList.toggle('border-transparent', !isMatch);
            t.classList.toggle('text-slate-500', !isMatch);
          });

          sections.forEach(sec => {
            sec.classList.toggle('hidden', sec.getAttribute('data-dock-section') !== targetSection);
          });
        });
      });
    }

    /**
     * Vision & Color Controls
     */
    bindVisionControls() {
      // Colorblindness filter buttons
      const filterBtns = document.querySelectorAll('[data-color-filter]');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const filter = btn.getAttribute('data-color-filter');
          State.set('colorFilter', filter);
        });
      });

      // Contrast mode buttons
      const contrastBtns = document.querySelectorAll('[data-contrast-mode]');
      contrastBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const contrast = btn.getAttribute('data-contrast-mode');
          State.set('contrastMode', contrast);
        });
      });
    }

    /**
     * Typography & Reading Controls
     */
    bindTypographyControls() {
      // Font family buttons
      const fontBtns = document.querySelectorAll('[data-font-family]');
      fontBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const font = btn.getAttribute('data-font-family');
          State.set('fontFamily', font);
        });
      });

      // Font scale buttons
      const scaleBtns = document.querySelectorAll('[data-font-scale]');
      scaleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const scale = parseFloat(btn.getAttribute('data-font-scale'));
          State.set('fontScale', scale);
        });
      });

      // Letter spacing buttons
      const letterBtns = document.querySelectorAll('[data-letter-spacing]');
      letterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const spacing = btn.getAttribute('data-letter-spacing');
          State.set('letterSpacing', spacing);
        });
      });

      // Line height buttons
      const lineBtns = document.querySelectorAll('[data-line-height]');
      lineBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const line = btn.getAttribute('data-line-height');
          State.set('lineHeight', line);
        });
      });

      // Reading ruler switch
      const rulerToggle = document.getElementById('toggle-reading-ruler');
      if (rulerToggle) {
        rulerToggle.addEventListener('click', () => {
          const current = State.get('readingRuler');
          State.set('readingRuler', !current);
        });
      }

      // Reduced motion switch
      const motionToggle = document.getElementById('toggle-reduced-motion');
      if (motionToggle) {
        motionToggle.addEventListener('click', () => {
          const current = State.get('reducedMotion');
          State.set('reducedMotion', !current);
        });
      }
    }

    /**
     * Visual Haptics & Focus Controls
     */
    bindHapticControls() {
      // Visual Haptic Feedback toggle
      const hapticToggle = document.getElementById('toggle-visual-haptics');
      if (hapticToggle) {
        hapticToggle.addEventListener('click', () => {
          const current = State.get('visualHapticsEnabled');
          State.set('visualHapticsEnabled', !current);
          this.updateToggleVisual(hapticToggle, !current);
          State.announce(!current ? 'Visual haptic emulation enabled.' : 'Visual haptic emulation disabled.');
        });
        this.updateToggleVisual(hapticToggle, State.get('visualHapticsEnabled'));
      }

      // Synthetic Audio Tick toggle
      const soundToggle = document.getElementById('toggle-haptic-sound');
      if (soundToggle) {
        soundToggle.addEventListener('click', () => {
          const current = State.get('hapticSound');
          State.set('hapticSound', !current);
          this.updateToggleVisual(soundToggle, !current);
          State.announce(!current ? 'Synthetic audio click confirmation enabled.' : 'Audio click confirmation muted.');
        });
        this.updateToggleVisual(soundToggle, State.get('hapticSound'));
      }

      // Enhanced Pulsing Focus toggle
      const enhancedFocusToggle = document.getElementById('toggle-enhanced-focus');
      if (enhancedFocusToggle) {
        enhancedFocusToggle.addEventListener('click', () => {
          const current = State.get('enhancedFocus');
          State.set('enhancedFocus', !current);
        });
      }

      // Focus theme swatches
      const focusThemeBtns = document.querySelectorAll('[data-focus-theme]');
      focusThemeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.getAttribute('data-focus-theme');
          State.set('focusStyle', theme);
        });
      });
    }

    /**
     * WCAG Inspector & Viva Cheat Sheet Modal
     */
    bindInspectorAndVivaModals() {
      // Toggle Inspector button in toolbar and header
      const inspectorBtns = document.querySelectorAll('.btn-trigger-inspector');
      inspectorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const current = State.get('inspectorActive');
          State.set('inspectorActive', !current);
        });
      });

      // Viva Cheat Sheet Modal Open
      const vivaModal = document.getElementById('viva-cheat-modal');
      const openVivaBtns = document.querySelectorAll('.btn-open-viva');
      const closeVivaBtn = document.getElementById('viva-modal-close');

      const openModal = () => {
        if (!vivaModal) return;
        if (window.InclusionKit.WCAGInspector?.restoreFullViva) {
          window.InclusionKit.WCAGInspector.restoreFullViva();
        }
        vivaModal.classList.remove('hidden');
        vivaModal.setAttribute('aria-hidden', 'false');
        if (closeVivaBtn) closeVivaBtn.focus();
        State.announce('HCI Viva Reference Guide opened.');
      };

      const closeModal = () => {
        if (!vivaModal) return;
        vivaModal.classList.add('hidden');
        vivaModal.setAttribute('aria-hidden', 'true');
        State.announce('HCI Viva Reference Guide closed.');
      };

      openVivaBtns.forEach(btn => btn.addEventListener('click', openModal));
      if (closeVivaBtn) closeVivaBtn.addEventListener('click', closeModal);

      if (vivaModal) {
        vivaModal.addEventListener('click', (e) => {
          if (e.target === vivaModal) closeModal();
        });

        // WCAG 2.1.2 Focus Trap inside viva modal
        vivaModal.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            closeModal();
            return;
          }
          if (e.key !== 'Tab') return;
          const focusables = Array.from(vivaModal.querySelectorAll('button:not([disabled]), [href], [tabindex="0"]')).filter(el => el.offsetParent !== null);
          if (!focusables.length) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        });
      }
    }

    /**
     * Global Keyboard Shortcuts for Examiner & User
     */
    bindKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Alt + A: Toggle Accessibility Dock
        if (e.altKey && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          if (this.dockToggleBtn) this.dockToggleBtn.click();
        }

        // Alt + I: Toggle WCAG Inspector
        if (e.altKey && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          const current = State.get('inspectorActive');
          State.set('inspectorActive', !current);
        }

        // Alt + R: Reset All
        if (e.altKey && e.key.toLowerCase() === 'r') {
          e.preventDefault();
          State.resetAll();
        }

        // Alt + V: Open Viva Cheat Sheet
        if (e.altKey && e.key.toLowerCase() === 'v') {
          e.preventDefault();
          const vivaBtn = document.querySelector('.btn-open-viva');
          if (vivaBtn) vivaBtn.click();
        }

        // ====================================================================
        // WCAG 2.1 AAA Single-Key Switch Access Shortcuts
        // Only active when not typing inside an input, textarea, or select
        // ====================================================================
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isEditing = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || document.activeElement?.isContentEditable;
        if (!isEditing && !e.altKey && !e.ctrlKey && !e.metaKey) {
          const key = e.key.toLowerCase();
          
          // 'v' -> Toggle Voice Assistant
          if (key === 'v') {
            e.preventDefault();
            if (window.InclusionKit.VoiceEngine && typeof window.InclusionKit.VoiceEngine.toggleListening === 'function') {
              window.InclusionKit.VoiceEngine.toggleListening();
            } else {
              document.getElementById('btn-voice-toggle')?.click();
            }
          }

          // 'c' -> Toggle High Contrast
          if (key === 'c') {
            e.preventDefault();
            const cur = State.get('contrastMode');
            const next = cur === 'high' ? 'normal' : 'high';
            State.set('contrastMode', next);
            if (window.InclusionKit.AcousticEngine) {
              window.InclusionKit.AcousticEngine.playConfirm();
            }
            if (window.InclusionKit.VoiceEngine) {
              window.InclusionKit.VoiceEngine.speak(next === 'high' ? 'High contrast mode enabled' : 'Normal contrast restored');
            }
          }

          // 'f' -> Cycle Font Scale
          if (key === 'f') {
            e.preventDefault();
            const scales = [1.0, 1.25, 1.5];
            const curScale = State.get('fontScale') || 1.0;
            const nextIdx = (scales.indexOf(curScale) + 1) % scales.length;
            const nextScale = scales[nextIdx];
            State.set('fontScale', nextScale);
            if (window.InclusionKit.AcousticEngine) {
              window.InclusionKit.AcousticEngine.playChime();
            }
            if (window.InclusionKit.VoiceEngine) {
              window.InclusionKit.VoiceEngine.speak(`Font scaled to ${Math.round(nextScale * 100)} percent`);
            }
          }

          // '?' -> Open Accessibility & Voice Guide
          if (e.key === '?' || (e.shiftKey && e.key === '/')) {
            e.preventDefault();
            const vivaBtn = document.querySelector('.btn-open-viva');
            if (vivaBtn) vivaBtn.click();
          }
        }
      });

      // Register Service Worker for offline PWA capability
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('[PWA] Service Worker registered with scope:', reg.scope))
            .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
        });
      }
    }

    /**
     * Reset All Accessibility Preferences
     */
    bindResetButton() {
      const resetBtns = document.querySelectorAll('.btn-reset-inclusionkit');
      resetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          State.resetAll();
          Haptics().triggerBoundaryCollision();
        });
      });
    }

    /**
     * Updates badge count indicating active non-default accessibility filters
     */
    updateActiveBadgeCounter() {
      const badge = document.getElementById('dock-active-count');
      if (!badge) return;

      let count = 0;
      if (State.get('colorFilter') !== 'none') count++;
      if (State.get('contrastMode') !== 'normal') count++;
      if (State.get('fontFamily') !== 'default') count++;
      if (State.get('fontScale') !== 1.0) count++;
      if (State.get('letterSpacing') !== 'normal') count++;
      if (State.get('lineHeight') !== 'normal') count++;
      if (State.get('readingRuler')) count++;
      if (State.get('reducedMotion')) count++;
      if (State.get('inspectorActive')) count++;

      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
      badge.classList.toggle('flex', count > 0);
    }

    updateToggleVisual(toggleBtn, isActive) {
      if (!toggleBtn) return;
      toggleBtn.setAttribute('aria-checked', isActive ? 'true' : 'false');
      const indicator = toggleBtn.querySelector('.toggle-indicator');
      if (indicator) {
        indicator.style.transform = isActive ? 'translateX(1.25rem)' : 'translateX(0)';
        toggleBtn.classList.toggle('bg-sky-600', isActive);
        toggleBtn.classList.toggle('bg-slate-300', !isActive);
      }
    }
  }

  // Initialize controller
  window.InclusionKit.AppController = new AppController();
})();
