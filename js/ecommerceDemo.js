/**
 * ============================================================================
 * INCLUSIONKIT - Interactive E-Commerce & Checkout Workspace
 * Real-world Accessible UI Demonstrating:
 * - WCAG 1.4.1 Use of Color (Multi-cue Swatches: Color + Shape + Label)
 * - WCAG 1.4.3 Minimum Contrast & 1.4.11 Non-text Contrast
 * - WCAG 2.1.1 Keyboard Navigable (WAI-ARIA Tabs & Dialog pattern)
 * - WCAG 2.5.5 Target Size (Minimum 44x44px touch targets)
 * - WCAG 3.3.1 Error Identification & 3.3.2 Labels or Instructions
 * - Topic 8: Tactile Emulation (Spring compression, ripple waves, boundary recoil)
 * ============================================================================
 */

window.InclusionKit = window.InclusionKit || {};

(function () {
  'use strict';

  const State = window.InclusionKit.State;
  const Haptics = window.InclusionKit.VisualHapticEngine;

  // Product finish variants with multi-modal cues (Color + Symbol + Text)
  const PRODUCT_VARIANTS = {
    obsidian: {
      name: 'Cosmic Obsidian',
      shape: '● Circle',
      hex: '#0f172a',
      accent: '#334155',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      alt: 'Sleek matte black adaptive headphones with memory foam cushions'
    },
    chalk: {
      name: 'Alpine Chalk',
      shape: '■ Square',
      hex: '#f8fafc',
      accent: '#e2e8f0',
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80',
      alt: 'Crisp arctic white adaptive headphones with brushed aluminum accents'
    },
    coral: {
      name: 'Coral Sunrise',
      shape: '▲ Triangle',
      hex: '#f97316',
      accent: '#ea580c',
      image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80',
      alt: 'Vibrant sunset coral adaptive headphones with high-visibility accents'
    },
    azure: {
      name: 'Pacific Azure',
      shape: '◆ Diamond',
      hex: '#0284c7',
      accent: '#0369a1',
      image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80',
      alt: 'Deep cobalt blue adaptive headphones with tactile braille volume toggles'
    }
  };

  class EcommerceDemo {
    constructor() {
      this.currentVariant = 'obsidian';
      this.quantity = 1;
      this.cartCount = 0;
      this.init();
    }

    init() {
      this.bindSwatches();
      this.bindQuantityControls();
      this.bindTabs();
      this.bindCheckoutModal();
      this.bindAddToCart();
    }

    /**
     * WCAG 1.4.1: Color Swatch Selector
     * Never relies solely on color: uses distinct geometric symbol icons,
     * explicit visible text labels, and ARIA radio role.
     */
    bindSwatches() {
      const swatches = document.querySelectorAll('[data-product-variant]');
      const activeLabel = document.getElementById('selected-finish-label');
      const productImage = document.getElementById('main-product-image');

      swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
          const variantKey = swatch.getAttribute('data-product-variant');
          const variant = PRODUCT_VARIANTS[variantKey];
          if (!variant) return;

          this.currentVariant = variantKey;

          // Update ARIA radio states
          swatches.forEach(s => {
            s.setAttribute('aria-checked', s === swatch ? 'true' : 'false');
            s.classList.toggle('ring-4', s === swatch);
            s.classList.toggle('ring-sky-500', s === swatch);
            s.classList.toggle('ring-offset-2', s === swatch);
          });

          // Update image and labels
          if (activeLabel) {
            activeLabel.textContent = `${variant.name} (${variant.shape})`;
          }
          if (productImage) {
            productImage.src = variant.image;
            productImage.alt = variant.alt;
          }

          State.announce(`Selected finish: ${variant.name}, identified by ${variant.shape}`);
        });

        // Keyboard arrow navigation for radio group (WAI-ARIA pattern)
        swatch.addEventListener('keydown', (e) => {
          const swatchArray = Array.from(swatches);
          const index = swatchArray.indexOf(swatch);
          let targetIndex = -1;

          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            targetIndex = (index + 1) % swatchArray.length;
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            targetIndex = (index - 1 + swatchArray.length) % swatchArray.length;
          }

          if (targetIndex !== -1) {
            e.preventDefault();
            swatchArray[targetIndex].focus();
            swatchArray[targetIndex].click();
          }
        });
      });
    }

    /**
     * Quantity Selector with Boundary Recoil (Topic 8: Tactile Emulation)
     */
    bindQuantityControls() {
      const decBtn = document.getElementById('btn-qty-decrease');
      const incBtn = document.getElementById('btn-qty-increase');
      const qtyInput = document.getElementById('product-qty-input');

      if (!decBtn || !incBtn || !qtyInput) return;

      const updateQty = (newQty) => {
        if (newQty < 1) {
          // Reached lower bound: trigger tactile boundary collision flash!
          Haptics.triggerBoundaryCollision();
          State.announce('Minimum order quantity of 1 reached.');
          return;
        }
        if (newQty > 5) {
          // Reached upper bound: trigger tactile boundary collision flash!
          Haptics.triggerBoundaryCollision();
          State.announce('Maximum order limit of 5 units per customer reached.');
          return;
        }

        this.quantity = newQty;
        qtyInput.value = newQty;
        qtyInput.setAttribute('aria-valuenow', newQty);
        State.announce(`Quantity updated to ${newQty}.`);
      };

      decBtn.addEventListener('click', () => updateQty(this.quantity - 1));
      incBtn.addEventListener('click', () => updateQty(this.quantity + 1));

      // Direct manual input validation
      qtyInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 5) val = 5;
        updateQty(val);
      });
    }

    /**
     * Accessible Tab Navigation (WCAG 2.1.1: WAI-ARIA Tablist Pattern)
     */
    bindTabs() {
      const tabs = document.querySelectorAll('[role="tab"]');
      const tabPanels = document.querySelectorAll('[role="tabpanel"]');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetId = tab.getAttribute('aria-controls');

          // Switch active tabs
          tabs.forEach(t => {
            const isTarget = t === tab;
            t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
            t.setAttribute('tabindex', isTarget ? '0' : '-1');
            t.classList.toggle('border-sky-600', isTarget);
            t.classList.toggle('text-sky-600', isTarget);
            t.classList.toggle('border-transparent', !isTarget);
            t.classList.toggle('text-slate-500', !isTarget);
          });

          // Switch active panels
          tabPanels.forEach(panel => {
            const isMatch = panel.id === targetId;
            panel.classList.toggle('hidden', !isMatch);
            panel.setAttribute('tabindex', isMatch ? '0' : '-1');
          });

          State.announce(`Switched to tab: ${tab.textContent.trim()}`);
        });

        // Keyboard Arrow Navigation for tabs
        tab.addEventListener('keydown', (e) => {
          const tabList = Array.from(tabs);
          const index = tabList.indexOf(tab);
          let nextIndex = -1;

          if (e.key === 'ArrowRight') {
            nextIndex = (index + 1) % tabList.length;
          } else if (e.key === 'ArrowLeft') {
            nextIndex = (index - 1 + tabList.length) % tabList.length;
          } else if (e.key === 'Home') {
            nextIndex = 0;
          } else if (e.key === 'End') {
            nextIndex = tabList.length - 1;
          }

          if (nextIndex !== -1) {
            e.preventDefault();
            tabList[nextIndex].focus();
            tabList[nextIndex].click();
          }
        });
      });
    }

    /**
     * Cart Item Counter with Live Region Announcement
     */
    bindAddToCart() {
      const btnAdd = document.getElementById('btn-add-to-cart');
      const cartBadge = document.getElementById('cart-counter-badge');

      if (!btnAdd) return;

      btnAdd.addEventListener('click', () => {
        this.cartCount += this.quantity;
        if (cartBadge) {
          cartBadge.textContent = this.cartCount;
          cartBadge.classList.remove('hidden');
          cartBadge.classList.add('inline-flex');
        }

        const variant = PRODUCT_VARIANTS[this.currentVariant];
        State.announce(
          `Success: Added ${this.quantity} units of AuraPulse Max (${variant.name}) to cart. Total items: ${this.cartCount}.`,
          'assertive'
        );
      });
    }

    /**
     * Accessible Modal Dialog (WCAG 2.1.2 No Keyboard Trap & 3.3.1 Error Handling)
     */
    bindCheckoutModal() {
      const btnBuyNow = document.getElementById('btn-buy-now');
      const modal = document.getElementById('checkout-modal');
      const closeBtn = document.getElementById('btn-close-checkout');
      const checkoutForm = document.getElementById('accessible-checkout-form');
      const successBanner = document.getElementById('checkout-success-view');

      if (!btnBuyNow || !modal) return;

      let previousActiveElement = null;

      const openModal = () => {
        previousActiveElement = document.activeElement;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('overflow-hidden');

        // Focus first input field inside modal
        const firstInput = modal.querySelector('input:not([disabled])');
        if (firstInput) firstInput.focus();

        State.announce('Checkout dialog opened. Fill out required shipping information.');
      };

      const closeModal = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('overflow-hidden');

        // Reset form and views
        if (checkoutForm) checkoutForm.classList.remove('hidden');
        if (successBanner) successBanner.classList.add('hidden');

        // Restore focus to button that opened modal (WCAG 2.4.3 Focus Order)
        if (previousActiveElement) previousActiveElement.focus();
        State.announce('Checkout dialog closed.');
      };

      btnBuyNow.addEventListener('click', openModal);
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      // Close on Backdrop Click or Escape key
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
          closeModal();
        }
      });

      // Accessible Form Validation Logic (WCAG 3.3.1 & 3.3.2)
      if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
          e.preventDefault();

          let hasErrors = false;
          let firstErrorField = null;

          const fields = [
            { id: 'checkout-name', errorId: 'name-error-msg', validate: (val) => val.trim().length >= 2, message: 'Please enter your full name (minimum 2 characters).' },
            { id: 'checkout-email', errorId: 'email-error-msg', validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), message: 'Please enter a valid email address (e.g. name@example.com).' },
            { id: 'checkout-address', errorId: 'address-error-msg', validate: (val) => val.trim().length >= 5, message: 'Please provide a valid delivery address.' }
          ];

          fields.forEach(field => {
            const input = document.getElementById(field.id);
            const errorContainer = document.getElementById(field.errorId);
            if (!input || !errorContainer) return;

            const isValid = field.validate(input.value);

            if (!isValid) {
              hasErrors = true;
              input.setAttribute('aria-invalid', 'true');
              input.classList.add('border-rose-500', 'bg-rose-50', 'ring-2', 'ring-rose-400');
              errorContainer.textContent = field.message;
              errorContainer.classList.remove('hidden');

              if (!firstErrorField) firstErrorField = input;
            } else {
              input.setAttribute('aria-invalid', 'false');
              input.classList.remove('border-rose-500', 'bg-rose-50', 'ring-2', 'ring-rose-400');
              errorContainer.textContent = '';
              errorContainer.classList.add('hidden');
            }
          });

          if (hasErrors) {
            // Trigger tactile collision shock
            Haptics.triggerBoundaryCollision();
            if (firstErrorField) {
              firstErrorField.focus();
            }
            State.announce('Form submission error: Please resolve highlighted validation errors.', 'assertive');
          } else {
            // Form is valid: Show confirmation view
            checkoutForm.classList.add('hidden');
            if (successBanner) {
              successBanner.classList.remove('hidden');
              const confirmBtn = successBanner.querySelector('button');
              if (confirmBtn) confirmBtn.focus();
            }
            State.announce('Order confirmed successfully! Thank you for purchasing AuraPulse Max.', 'assertive');
          }
        });
      }
    }
  }

  // Export module singleton
  window.InclusionKit.EcommerceDemo = new EcommerceDemo();
})();
