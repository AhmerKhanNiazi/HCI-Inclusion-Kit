/**
 * @file voiceEngine.js
 * @description InclusionKit Voice Engine — Speech Recognition + TTS command controller.
 * Wraps the Web Speech API (SpeechRecognition / webkitSpeechRecognition) with graceful
 * fallback, a TTS queue via window.speechSynthesis, and a rich set of voice commands
 * that map to InclusionKit accessibility State mutations.
 *
 * Namespace: window.InclusionKit.VoiceEngine
 *
 * @module VoiceEngine
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ─────────────────────────────────────────────────────────────────────────
   * 0. Namespace bootstrap
   * ───────────────────────────────────────────────────────────────────────── */
  window.InclusionKit = window.InclusionKit || {};

  /** Convenience alias for the shared State manager. */
  const State = window.InclusionKit.State || null;

  /* ─────────────────────────────────────────────────────────────────────────
   * 1. Internal state
   * ───────────────────────────────────────────────────────────────────────── */

  /** @type {SpeechRecognition|null} The active recognition instance. */
  let recognition = null;

  /** @type {boolean} Whether continuous listening is requested by user. */
  let isListening = false;

  /** @type {boolean} Whether recognition is currently active in the browser. */
  let isRecognizing = false;

  /** @type {number|null} Timer ID for debounced restart. */
  let restartTimer = null;

  /** @type {number} Circuit breaker counter for rapid consecutive aborts. */
  let consecutiveAborts = 0;

  /** @type {boolean} Whether system TTS is currently speaking aloud. */
  let isSpeakingTTS = false;

  /** @type {boolean} Whether hover-to-read (point-to-speak) mode is active. */
  let isHoverReadMode = false;

  /** @type {number|null} Timer ID for debounced hover reading. */
  let hoverReadTimer = null;

  /** @type {HTMLElement|null} Currently highlighted element under mouse cursor. */
  let currentHoveredEl = null;

  /** @type {boolean} Whether the browser supports SpeechRecognition. */
  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  /* ─────────────────────────────────────────────────────────────────────────
   * 2. DOM element references (may be null if page does not include them)
   * ───────────────────────────────────────────────────────────────────────── */

  /** @type {HTMLElement|null} Transcript text display container. */
  const transcriptEl = document.getElementById('voice-transcript-text');

  /** @type {HTMLElement|null} Animated "listening" badge. */
  const badgeEl = document.getElementById('voice-listening-badge');

  /** @type {HTMLButtonElement|null} Mic toggle button. */
  const toggleBtn = document.getElementById('btn-voice-toggle');

  /** @type {HTMLElement|null} ARIA live region for screen-reader announcements. */
  const announcer = document.getElementById('sr-announcer');

  /* ─────────────────────────────────────────────────────────────────────────
   * 3. Helpers
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Pushes a message to the ARIA live region so screen readers announce it.
   * @param {string} message - Text to announce.
   */
  function ariaAnnounce(message) {
    if (!announcer) return;
    // Clearing then setting forces re-announcement even for repeated strings.
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }

  /**
   * Updates the interim / final transcript display element.
   * @param {string} text     - Text to display.
   * @param {boolean} isFinal - If true, style as finalised transcript.
   */
  function setTranscript(text, isFinal = false) {
    if (!transcriptEl) return;
    transcriptEl.textContent = text;
    transcriptEl.classList.toggle('transcript--final', isFinal);
    transcriptEl.classList.toggle('transcript--interim', !isFinal);
  }

  /**
   * Syncs all UI chrome (badge, button aria-pressed, data-active) to the current
   * `isListening` value.
   */
  function syncUI() {
    if (badgeEl) {
      badgeEl.hidden = !isListening;
      badgeEl.classList.toggle('hidden', !isListening);
      badgeEl.setAttribute('aria-hidden', String(!isListening));
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(isListening));
      toggleBtn.setAttribute('data-active', String(isListening));
      toggleBtn.classList.toggle('active', isListening);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 4. TTS / Speech Synthesis
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Resolves the best available English female voice.
   * Returns null if speechSynthesis is unavailable or no suitable voice found.
   * @returns {SpeechSynthesisVoice|null}
   */
  function getBestVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    // Prefer English female voices (name heuristic common across browsers).
    const female = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        /female|woman|zira|hazel|susan|victoria|samantha|karen|moira|fiona/i.test(v.name)
    );
    if (female) return female;
    // Fall back to any English voice.
    return voices.find((v) => v.lang.startsWith('en')) || null;
  }

  /**
   * Speaks the given text via the Web Speech Synthesis API.
   * Cancels any in-progress utterance first to avoid overlapping speech.
   * Uses a clear English female voice when available.
   *
   * @param {string} text - The string to be spoken aloud.
   */
  function speak(text) {
    if (!window.speechSynthesis || !text) return;
    // Cancel any currently spoken utterance.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    utterance.onstart = () => {
      isSpeakingTTS = true;
    };
    utterance.onend = () => {
      setTimeout(() => {
        isSpeakingTTS = false;
      }, 300);
    };
    utterance.onerror = () => {
      isSpeakingTTS = false;
    };

    // Voices may not be loaded yet on first call — retry after voices load.
    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    } else {
      // If voices not yet populated, wait for the voiceschanged event.
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => {
          const v = getBestVoice();
          if (v) utterance.voice = v;
        },
        { once: true }
      );
    }

    window.speechSynthesis.speak(utterance);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 5. Font scale cycling helper
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Cycles the font scale up through the progression 1.0 → 1.25 → 1.5 → 2.0 → 1.0.
   * Reads the current value from State (if available) and increments it.
   */
  function cycleFontScaleUp() {
    if (!State) return 1.0;
    const steps = [1.0, 1.25, 1.5, 2.0];
    const current = State.get ? State.get('fontScale') : 1.0;
    const curNum = parseFloat(current) || 1.0;
    let idx = steps.findIndex(s => Math.abs(s - curNum) < 0.05);
    if (idx === -1) idx = 0;
    const next = steps[(idx + 1) % steps.length];
    State.set('fontScale', next);
    return next;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 6. Page summary builder
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Builds a concise spoken summary of the current page.
   * Uses the document title, H1, and meta description as available.
   * @returns {string} A spoken-friendly summary string.
   */
  function buildPageSummary() {
    const title = document.title || 'Untitled page';
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const meta = document
      .querySelector('meta[name="description"]')
      ?.getAttribute('content') || '';
    const parts = [`You are on: ${title}.`];
    if (h1 && h1 !== title) parts.push(`Main heading: ${h1}.`);
    if (meta) parts.push(meta);
    return parts.join(' ');
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 6.1 Hover-to-Read (Point to Speak / Screen Reader Cursor Engine)
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Extracts clean, natural screen-reader text from an inspected DOM element.
   * Prioritises ARIA semantics, button labels, images, headings, and prices.
   *
   * @param {HTMLElement} el - Target DOM element.
   * @returns {string} Natural text representation to speak aloud.
   */
  function extractReadableContent(el) {
    if (!el || !(el instanceof HTMLElement)) return '';

    // Check aria-label first
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
        return /button/i.test(ariaLabel) ? ariaLabel : `${ariaLabel}, button`;
      }
      return ariaLabel;
    }

    // Check image
    if (el.tagName === 'IMG') {
      const alt = el.getAttribute('alt');
      return alt ? `Image: ${alt}` : 'Image';
    }

    // Check form inputs & selects
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
      const label = document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() || el.placeholder || 'Input field';
      return `${label}, current value: ${el.value || 'empty'}`;
    }

    // Check headings
    if (/^H[1-6]$/i.test(el.tagName)) {
      return `Heading: ${el.textContent.trim()}`;
    }

    // Check buttons
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      return /button/i.test(txt) ? txt : `${txt}, button`;
    }

    // Check links
    if (el.tagName === 'A') {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      return `${txt}, link`;
    }

    // Check tabs
    if (el.getAttribute('role') === 'tab') {
      return `${el.textContent.trim()}, tab`;
    }

    // Check radio swatches
    if (el.getAttribute('role') === 'radio') {
      return `${el.textContent.trim()}, color swatch`;
    }

    // General text
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    if (text.length > 250) {
      const firstSentence = text.split(/[.?!]/)[0];
      return firstSentence && firstSentence.length > 20 ? firstSentence + '.' : text.slice(0, 180) + '...';
    }
    return text;
  }

  /**
   * Mouseover listener for Hover-to-Read mode. Debounces speech by 250ms.
   */
  function handleHoverRead(e) {
    if (!isHoverReadMode) return;

    // Ignore events inside control docks or voice badges
    if (e.target.closest('#voice-listening-badge, #hover-read-badge, #btn-voice-toggle, #accessibility-dock')) {
      return;
    }

    const target = e.target.closest(
      'h1, h2, h3, h4, h5, h6, p, button, a, label, input, select, li, [role="radio"], [role="tab"], [role="button"], img, .surface-card, .wcag-inspect-target'
    );

    if (!target || target === currentHoveredEl) return;

    if (currentHoveredEl) {
      currentHoveredEl.classList.remove('hover-read-target');
    }

    currentHoveredEl = target;
    target.classList.add('hover-read-target');

    if (hoverReadTimer) clearTimeout(hoverReadTimer);
    hoverReadTimer = setTimeout(() => {
      if (!isHoverReadMode || currentHoveredEl !== target) return;
      const speech = extractReadableContent(target);
      if (speech && speech.length > 1) {
        speak(speech);
      }
    }, 250);
  }

  /**
   * Mouseout listener for Hover-to-Read mode. Clears highlight and pending utterance.
   */
  function handleHoverReadLeave(e) {
    if (!isHoverReadMode) return;
    if (e.target === currentHoveredEl) {
      currentHoveredEl.classList.remove('hover-read-target');
      currentHoveredEl = null;
      if (hoverReadTimer) clearTimeout(hoverReadTimer);
    }
  }

  /**
   * Enables Hover-to-Read mode.
   */
  function enableHoverRead() {
    if (isHoverReadMode) return;
    isHoverReadMode = true;
    document.body.classList.add('hover-read-active');

    const badge = document.getElementById('hover-read-badge');
    if (badge) {
      badge.classList.remove('hidden');
      badge.setAttribute('aria-hidden', 'false');
    }

    const dockSwitch = document.getElementById('toggle-hover-read');
    if (dockSwitch) {
      dockSwitch.setAttribute('aria-checked', 'true');
      dockSwitch.classList.add('bg-sky-600');
      dockSwitch.classList.remove('bg-slate-300');
      dockSwitch.querySelector('.toggle-indicator')?.classList.add('translate-x-5');
    }

    document.addEventListener('mouseover', handleHoverRead, { passive: true });
    document.addEventListener('mouseout', handleHoverReadLeave, { passive: true });

    speak('Hover to read mode activated. Move your mouse over any element to hear it spoken.');
    ariaAnnounce('Hover to read mode activated. Point cursor at any element to hear it.');
  }

  /**
   * Disables Hover-to-Read mode.
   */
  function disableHoverRead() {
    if (!isHoverReadMode) return;
    isHoverReadMode = false;
    document.body.classList.remove('hover-read-active');

    if (currentHoveredEl) {
      currentHoveredEl.classList.remove('hover-read-target');
      currentHoveredEl = null;
    }
    if (hoverReadTimer) {
      clearTimeout(hoverReadTimer);
      hoverReadTimer = null;
    }

    const badge = document.getElementById('hover-read-badge');
    if (badge) {
      badge.classList.add('hidden');
      badge.setAttribute('aria-hidden', 'true');
    }

    const dockSwitch = document.getElementById('toggle-hover-read');
    if (dockSwitch) {
      dockSwitch.setAttribute('aria-checked', 'false');
      dockSwitch.classList.remove('bg-sky-600');
      dockSwitch.classList.add('bg-slate-300');
      dockSwitch.querySelector('.toggle-indicator')?.classList.remove('translate-x-5');
    }

    document.removeEventListener('mouseover', handleHoverRead);
    document.removeEventListener('mouseout', handleHoverReadLeave);

    speak('Hover to read mode deactivated.');
    ariaAnnounce('Hover to read mode deactivated.');
  }

  /**
   * Toggles Hover-to-Read mode on or off.
   */
  function toggleHoverRead() {
    if (isHoverReadMode) {
      disableHoverRead();
    } else {
      enableHoverRead();
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 7. Command parser & Comprehensive Command Dictionary
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * @typedef {Object} VoiceCommand
   * @property {string[]} patterns  - Substrings that trigger this command (case-insensitive).
   * @property {Function} action    - Handler executed when a pattern matches.
   */

  /**
   * Comprehensive list of recognised voice commands controlling the entire web.
   * Matching uses fuzzy substring detection (case-insensitive).
   *
   * @type {VoiceCommand[]}
   */
  const COMMANDS = [
    // ── 1. Hover-to-Read Mode (Point to Speak) ─────────────────────────────
    {
      patterns: [
        'read mode',
        'start reading',
        'enable read mode',
        'hover to read',
        'read on hover',
        'point to speak',
        'screen reader mode',
        'hover read',
      ],
      action() {
        enableHoverRead();
      },
    },
    {
      patterns: [
        'stop reading',
        'stop read mode',
        'disable read mode',
        'exit read mode',
        'turn off read mode',
        'disable hover',
      ],
      action() {
        disableHoverRead();
      },
    },

    // ── 2. Speech Control (Silence / Stop Talking) ─────────────────────────
    {
      patterns: [
        'stop speaking',
        'stop talking',
        'silence',
        'quiet',
        'shut up',
        'pause speech',
      ],
      action() {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        isSpeakingTTS = false;
      },
    },

    // ── 3. Page Scrolling & Viewport Navigation ────────────────────────────
    {
      patterns: ['scroll down', 'page down', 'go down', 'move down'],
      action() {
        window.scrollBy({ top: 450, behavior: 'smooth' });
        speak('Scrolling down');
      },
    },
    {
      patterns: ['scroll up', 'page up', 'go up', 'move up'],
      action() {
        window.scrollBy({ top: -450, behavior: 'smooth' });
        speak('Scrolling up');
      },
    },
    {
      patterns: ['scroll to top', 'go to top', 'top of page', 'back to top'],
      action() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        speak('Scrolled to top of page');
      },
    },
    {
      patterns: ['scroll to bottom', 'go to bottom', 'bottom of page', 'go to footer'],
      action() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        speak('Scrolled to bottom of page');
      },
    },

    // ── 4. Section & Tab Navigation ─────────────────────────────────────────
    {
      patterns: ['go to product', 'show product', 'view product', 'product showcase'],
      action() {
        document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
        speak('Viewing AuraPulse Max headphone showcase');
      },
    },
    {
      patterns: ['go to specs', 'show specs', 'specifications', 'specs tab'],
      action() {
        const tab = document.getElementById('tab-specs');
        tab?.click();
        tab?.scrollIntoView({ behavior: 'smooth' });
        speak('Technical specifications displayed');
      },
    },
    {
      patterns: ['go to accessibility', 'show accessibility', 'accessibility tab', 'inclusive features'],
      action() {
        const tab = document.getElementById('tab-accessibility');
        tab?.click();
        tab?.scrollIntoView({ behavior: 'smooth' });
        speak('Accessibility features panel displayed');
      },
    },
    {
      patterns: ['go to reviews', 'show reviews', 'customer reviews', 'reviews tab'],
      action() {
        const tab = document.getElementById('tab-reviews');
        tab?.click();
        tab?.scrollIntoView({ behavior: 'smooth' });
        speak('Customer reviews displayed');
      },
    },

    // ── 5. Color Swatch Finishes ───────────────────────────────────────────
    {
      patterns: ['select obsidian', 'obsidian', 'select black', 'black color', 'circle color', 'circle shape'],
      action() {
        document.querySelector('[data-product-variant="obsidian"]')?.click();
        speak('Cosmic Obsidian black finish selected');
      },
    },
    {
      patterns: ['select chalk', 'chalk', 'select white', 'white color', 'square color', 'square shape'],
      action() {
        document.querySelector('[data-product-variant="chalk"]')?.click();
        speak('Alpine Chalk white finish selected');
      },
    },
    {
      patterns: ['select coral', 'coral', 'select orange', 'orange color', 'triangle color', 'triangle shape'],
      action() {
        document.querySelector('[data-product-variant="coral"]')?.click();
        speak('Coral Sunrise finish selected');
      },
    },
    {
      patterns: ['select azure', 'azure', 'select blue', 'blue color', 'diamond color', 'diamond shape'],
      action() {
        document.querySelector('[data-product-variant="azure"]')?.click();
        speak('Pacific Azure blue finish selected');
      },
    },

    // ── 6. Quantity Steppers & Direct Values ───────────────────────────────
    {
      patterns: ['increase quantity', 'add quantity', 'more quantity', 'more items', 'plus one', 'quantity plus', 'add more'],
      action() {
        document.getElementById('btn-qty-increase')?.click();
        const q = document.getElementById('product-qty-input')?.value || '1';
        speak(`Quantity increased to ${q}`);
      },
    },
    {
      patterns: ['decrease quantity', 'reduce quantity', 'less quantity', 'reduce items', 'minus one', 'quantity minus', 'less items'],
      action() {
        document.getElementById('btn-qty-decrease')?.click();
        const q = document.getElementById('product-qty-input')?.value || '1';
        speak(`Quantity decreased to ${q}`);
      },
    },
    {
      patterns: ['quantity 1', 'quantity one', 'set quantity to 1', 'set quantity to one'],
      action() {
        const inp = document.getElementById('product-qty-input');
        if (inp) {
          inp.value = '1';
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        speak('Quantity set to 1');
      },
    },
    {
      patterns: ['quantity 2', 'quantity two', 'set quantity to 2', 'set quantity to two'],
      action() {
        const inp = document.getElementById('product-qty-input');
        if (inp) {
          inp.value = '2';
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        speak('Quantity set to 2');
      },
    },
    {
      patterns: ['quantity 3', 'quantity three', 'set quantity to 3', 'set quantity to three'],
      action() {
        const inp = document.getElementById('product-qty-input');
        if (inp) {
          inp.value = '3';
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        speak('Quantity set to 3');
      },
    },
    {
      patterns: ['quantity 4', 'quantity four', 'set quantity to 4', 'set quantity to four'],
      action() {
        const inp = document.getElementById('product-qty-input');
        if (inp) {
          inp.value = '4';
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        speak('Quantity set to 4');
      },
    },
    {
      patterns: ['quantity 5', 'quantity five', 'set quantity to 5', 'set quantity to five', 'maximum quantity'],
      action() {
        const inp = document.getElementById('product-qty-input');
        if (inp) {
          inp.value = '5';
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
        speak('Quantity set to 5, which is the maximum limit');
      },
    },

    // ── 7. Cart, Checkout & Purchasing ─────────────────────────────────────
    {
      patterns: ['add to cart', 'put in cart', 'buy headphone', 'add item', 'purchase'],
      action() {
        document.getElementById('btn-add-to-cart')?.click();
        speak('Added AuraPulse Max to your shopping cart');
      },
    },
    {
      patterns: ['open cart', 'view cart', 'show cart', 'shopping cart', 'my cart'],
      action() {
        document.getElementById('header-cart-btn')?.click();
        speak('Shopping cart opened');
      },
    },
    {
      patterns: ['close cart', 'hide cart'],
      action() {
        document.getElementById('btn-close-cart')?.click();
        speak('Cart closed');
      },
    },
    {
      patterns: ['checkout', 'buy now', 'proceed to checkout', 'open checkout', 'pay now'],
      action() {
        document.getElementById('btn-buy-now')?.click();
        speak('Opening accessible checkout dialog');
      },
    },
    {
      patterns: ['close checkout', 'cancel checkout'],
      action() {
        document.getElementById('btn-close-checkout')?.click();
        speak('Checkout dialog closed');
      },
    },
    {
      patterns: ['what is the price', 'read price', 'how much', 'pricing', 'cost'],
      action() {
        speak('AuraPulse Max is on sale for 219 dollars, discounted from 299 dollars, saving you 80 dollars or 27 percent.');
      },
    },
    {
      patterns: ['what are the reviews', 'read reviews', 'rating', 'how many stars'],
      action() {
        speak('Rated 4.9 out of 5 stars based on 1,280 verified customer reviews.');
      },
    },

    // ── 8. High Contrast (WCAG 1.4.3 & 1.4.6) ──────────────────────────────
    {
      patterns: ['high contrast', 'enable contrast', 'turn on contrast', 'dark contrast', 'dark mode'],
      action() {
        State?.set('contrastMode', 'high');
        window.InclusionKit?.AcousticEngine?.playConfirm();
        speak('High contrast mode enabled');
      },
    },
    {
      patterns: ['normal contrast', 'disable contrast', 'reset contrast', 'turn off contrast', 'standard contrast', 'light mode'],
      action() {
        State?.set('contrastMode', 'normal');
        window.InclusionKit?.AcousticEngine?.playConfirm();
        speak('Normal contrast restored');
      },
    },
    {
      patterns: ['inverted contrast', 'invert colors', 'invert mode'],
      action() {
        State?.set('contrastMode', 'inverted');
        window.InclusionKit?.AcousticEngine?.playConfirm();
        speak('Inverted color contrast mode active');
      },
    },

    // ── 9. Font Scaling (WCAG 1.4.4) ───────────────────────────────────────
    {
      patterns: ['increase font', 'bigger text', 'larger font', 'zoom in', 'larger text', 'bigger font'],
      action() {
        const next = cycleFontScaleUp();
        window.InclusionKit?.AcousticEngine?.playChime();
        speak(`Font increased to ${Math.round(next * 100)} percent`);
      },
    },
    {
      patterns: ['decrease font', 'smaller text', 'smaller font', 'zoom out'],
      action() {
        if (!State) return;
        const steps = [1.0, 1.25, 1.5, 2.0];
        const current = State.get ? State.get('fontScale') : 1.0;
        const curNum = parseFloat(current) || 1.0;
        let idx = steps.findIndex(s => Math.abs(s - curNum) < 0.05);
        if (idx === -1) idx = 1;
        const next = steps[(idx - 1 + steps.length) % steps.length];
        State.set('fontScale', next);
        window.InclusionKit?.AcousticEngine?.playChime();
        speak(`Font adjusted to ${Math.round(next * 100)} percent`);
      },
    },
    {
      patterns: ['reset font', 'normal font', 'default font size', 'reset zoom'],
      action() {
        State?.set('fontScale', 1.0);
        window.InclusionKit?.AcousticEngine?.playConfirm();
        speak('Font reset to normal 100 percent');
      },
    },

    // ── 10. Specialized Typography (Topic 3) ────────────────────────────────
    {
      patterns: ['dyslexic', 'dyslexia font', 'opendyslexic'],
      action() {
        State?.set('fontFamily', 'dyslexic');
        speak('OpenDyslexic weighted font enabled');
      },
    },
    {
      patterns: ['hyperlegible', 'low vision font', 'braille font'],
      action() {
        State?.set('fontFamily', 'hyperlegible');
        speak('Atkinson Hyperlegible low vision font enabled');
      },
    },
    {
      patterns: ['standard font', 'inter font', 'default typography'],
      action() {
        State?.set('fontFamily', 'default');
        speak('Standard typography restored');
      },
    },
    {
      patterns: ['letter spacing', 'wide spacing', 'increase spacing'],
      action() {
        const cur = State?.get('letterSpacing') || 'normal';
        const next = cur === 'normal' ? 'wide' : cur === 'wide' ? 'extra' : 'normal';
        State?.set('letterSpacing', next);
        speak(`Letter spacing set to ${next}`);
      },
    },
    {
      patterns: ['line height', 'tall lines', 'increase line height'],
      action() {
        const cur = State?.get('lineHeight') || 1.5;
        const next = cur >= 2.0 ? 1.5 : 2.0;
        State?.set('lineHeight', next);
        speak(next === 2.0 ? 'Expanded double line height enabled' : 'Standard line height restored');
      },
    },

    // ── 11. Color Vision Deficiency Filters (WCAG 1.4.1) ────────────────────
    {
      patterns: ['protanopia', 'red blind', 'protan'],
      action() {
        State?.set('colorFilter', 'protanopia');
        speak('Protanopia red-blind simulation active');
      },
    },
    {
      patterns: ['deuteranopia', 'green blind', 'deutan'],
      action() {
        State?.set('colorFilter', 'deuteranopia');
        speak('Deuteranopia green-blind filter active');
      },
    },
    {
      patterns: ['tritanopia', 'blue blind', 'tritan'],
      action() {
        State?.set('colorFilter', 'tritanopia');
        speak('Tritanopia blue-blind filter active');
      },
    },
    {
      patterns: ['colorblind', 'grayscale', 'monochrome', 'achromatopsia'],
      action() {
        State?.set('colorFilter', 'grayscale');
        speak('Achromatopsia grayscale mode active');
      },
    },
    {
      patterns: ['normal color', 'no filter', 'clear filter', 'reset color', 'full color'],
      action() {
        State?.set('colorFilter', 'none');
        speak('Color filters cleared, full color restored');
      },
    },

    // ── 12. Sensory Aids & Acoustic Masking (Topic 8) ──────────────────────
    {
      patterns: ['reading ruler', 'ruler on', 'line guide', 'show ruler'],
      action() {
        State?.set('readingRuler', true);
        speak('Reading guide ruler activated');
      },
    },
    {
      patterns: ['ruler off', 'hide ruler', 'disable ruler', 'turn off ruler'],
      action() {
        State?.set('readingRuler', false);
        speak('Reading guide ruler hidden');
      },
    },
    {
      patterns: ['focus spotlight', 'spotlight', 'dim background'],
      action() {
        const cur = State?.get('focusSpotlight') || false;
        State?.set('focusSpotlight', !cur);
        speak(!cur ? 'Focus spotlight active' : 'Focus spotlight disabled');
      },
    },
    {
      patterns: ['masking noise', 'rain noise', 'white noise', 'rain sound', 'ambient sound', 'play rain'],
      action() {
        window.InclusionKit?.AcousticEngine?.toggleMaskingNoise();
      },
    },
    {
      patterns: ['stop rain', 'stop noise', 'mute noise', 'turn off rain'],
      action() {
        window.InclusionKit?.AcousticEngine?.stopMaskingNoise();
        speak('Acoustic masking noise stopped');
      },
    },
    {
      patterns: ['play sound', 'focus sound', 'chime', 'test sound'],
      action() {
        window.InclusionKit?.AcousticEngine?.playChime();
        speak('Acoustic chime played');
      },
    },
    {
      patterns: ['mute audio', 'mute sound', 'mute'],
      action() {
        State?.set('hapticSound', false);
        speak('Audio muted');
      },
    },
    {
      patterns: ['unmute audio', 'unmute sound', 'unmute'],
      action() {
        State?.set('hapticSound', true);
        window.InclusionKit?.AcousticEngine?.playConfirm();
        speak('Audio enabled');
      },
    },

    // ── 13. WCAG Inspector & Viva Guide ────────────────────────────────────
    {
      patterns: ['open inspector', 'wcag inspector', 'inspect', 'audit'],
      action() {
        State?.set('inspectorActive', true);
        speak('WCAG 2.1 inspector mode opened. Click any element to audit.');
      },
    },
    {
      patterns: ['close inspector', 'exit inspector', 'stop inspecting'],
      action() {
        State?.set('inspectorActive', false);
        speak('WCAG inspector closed');
      },
    },
    {
      patterns: ['open toolbar', 'open dock', 'accessibility engine', 'open menu'],
      action() {
        document.getElementById('btn-toggle-dock')?.click();
        speak('Accessibility engine toolbar opened');
      },
    },
    {
      patterns: ['close toolbar', 'close dock', 'close menu'],
      action() {
        document.getElementById('btn-close-dock')?.click();
        speak('Accessibility toolbar closed');
      },
    },
    {
      patterns: ['help', 'commands', 'what can i say', 'viva', 'cheat sheet', 'examiner guide'],
      action() {
        document.querySelector('.btn-open-viva')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        speak('Opening accessibility guide and full voice command reference');
      },
    },
    {
      patterns: ['close dialog', 'close modal', 'close window', 'dismiss', 'escape', 'cancel'],
      action() {
        document.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            bubbles: true,
            cancelable: true,
          })
        );
        speak('Dialog dismissed');
      },
    },
    {
      patterns: ['read page', 'page summary', 'read summary', 'what is on this page'],
      action() {
        speak(buildPageSummary());
      },
    },
  ];

  /**
   * Attempts to match a transcript string against the known command list.
   * Uses case-insensitive substring matching ("fuzzy" intent detection).
   *
   * @param {string} transcript - Spoken transcript from SpeechRecognition.
   * @returns {boolean} `true` if a command was matched and executed, `false` otherwise.
   */
  function parseCommand(transcript) {
    const clean = transcript.toLowerCase().trim().replace(/[.,?!]+$/, '');
    for (const cmd of COMMANDS) {
      if (cmd.patterns.some((p) => clean.includes(p))) {
        cmd.action();
        return true;
      }
    }
    // No match — inform user with hint.
    speak('Command not recognised. Say help for commands or say read mode to hear elements you hover on.');
    return false;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 8. SpeechRecognition setup
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Initialises and configures a new SpeechRecognition instance.
   * Sets continuous + interimResults mode, wires up event handlers for
   * interim transcript display and final command parsing.
   *
   * @returns {SpeechRecognition|null} Configured recognition object, or null if unsupported.
   */
  function createRecognition() {
    if (!isSupported) return null;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognitionAPI();

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    /**
     * Fired when the recogniser returns results.
     * Interim results are shown in the transcript display;
     * final results are routed through the command parser.
     */
    rec.onresult = (event) => {
      if (isSpeakingTTS) {
        // Discard captured sound while the computer's TTS is speaking to prevent feedback loops
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript) {
        setTranscript(interimTranscript, false);
      }

      if (finalTranscript) {
        setTranscript(finalTranscript, true);
        parseCommand(finalTranscript);
      }
    };

    /**
     * Fired when the recogniser successfully starts audio capture.
     */
    rec.onstart = () => {
      isRecognizing = true;
      consecutiveAborts = 0;
    };

    /**
     * Fired when the recogniser ends.
     * Restarts with a backoff delay if continuous listening is desired,
     * and triggers a circuit breaker if rapid consecutive aborts happen.
     */
    rec.onend = () => {
      isRecognizing = false;
      if (!isListening) return;

      // Circuit breaker: If 3 or more consecutive aborts happen, pause cleanly
      if (consecutiveAborts >= 3) {
        console.info('[VoiceEngine] Recognition paused after consecutive aborts.');
        stopListening();
        ariaAnnounce('Voice recognition paused. Click microphone or press V to restart.');
        return;
      }

      // Throttled restart with backoff delay (minimum 600ms) to prevent infinite browser loop
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (isListening && !isRecognizing) {
          try {
            rec.start();
          } catch (e) {
            // Ignore InvalidStateError if already active
          }
        }
      }, 600);
    };

    /**
     * Fired on recogniser error. Handles common error types gracefully.
     */
    rec.onerror = (event) => {
      if (event.error === 'aborted') {
        consecutiveAborts++;
        // 'aborted' is a standard Web Speech event when speech is interrupted or restarted; do not spam console
        return;
      }
      if (event.error === 'no-speech') {
        // Harmless browser silence timeout
        consecutiveAborts = 0;
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.warn('[VoiceEngine] Microphone permission denied:', event.error);
        ariaAnnounce('Microphone access denied. Please allow microphone permission.');
        stopListening();
        return;
      }
      consecutiveAborts++;
      console.warn('[VoiceEngine] Recognition error:', event.error);
    };

    /**
     * Fired when the recogniser begins capturing audio.
     */
    rec.onaudiostart = () => {
      isRecognizing = true;
    };

    return rec;
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 9. Start / Stop / Toggle
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Starts continuous voice listening.
   * Creates a recognition instance on first use, then starts it.
   * Updates all UI chrome and announces via ARIA.
   */
  function startListening() {
    if (!isSupported) {
      speak('Sorry, your browser does not support voice recognition.');
      ariaAnnounce('Voice recognition is not supported in this browser.');
      return;
    }
    if (isListening && isRecognizing) return;

    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    consecutiveAborts = 0;
    isListening = true;
    syncUI();

    recognition = recognition || createRecognition();
    if (!recognition) return;

    try {
      recognition.start();
    } catch (e) {
      if (e.name !== 'InvalidStateError') {
        console.warn('[VoiceEngine] Could not start recognition:', e);
      }
    }
    ariaAnnounce('Voice recognition started. Listening for commands.');
  }

  /**
   * Stops continuous voice listening and clears the transcript display.
   * Updates all UI chrome and announces via ARIA.
   */
  function stopListening() {
    if (!isListening && !isRecognizing) return;
    isListening = false;
    isRecognizing = false;

    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    consecutiveAborts = 0;

    try {
      recognition?.abort();
    } catch (e) {
      // Ignore stop errors.
    }

    setTranscript('', false);
    syncUI();
    ariaAnnounce('Voice recognition stopped.');
  }

  /**
   * Toggles continuous listening on or off.
   * Primary handler for the `#btn-voice-toggle` button.
   */
  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 10. Button event binding
   * ───────────────────────────────────────────────────────────────────────── */

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleListening);
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 11. Initial UI sync
   * ───────────────────────────────────────────────────────────────────────── */

  // Set initial ARIA state on the toggle button.
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', 'false');
  }
  if (badgeEl) {
    badgeEl.hidden = true;
    badgeEl.setAttribute('aria-hidden', 'true');
  }

  // Bind Hover-to-Read exit button and dock toggle switch.
  const stopHoverBtn = document.getElementById('btn-stop-hover-read');
  if (stopHoverBtn) {
    stopHoverBtn.addEventListener('click', disableHoverRead);
  }

  const dockHoverToggle = document.getElementById('toggle-hover-read');
  if (dockHoverToggle) {
    dockHoverToggle.addEventListener('click', toggleHoverRead);
  }

  // Warn if the browser does not support the API.
  if (!isSupported) {
    console.warn('[VoiceEngine] SpeechRecognition is not supported in this browser.');
    if (toggleBtn) {
      toggleBtn.disabled = true;
      toggleBtn.title = 'Voice recognition is not supported in your browser.';
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 12. Public API
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * Public interface exposed on `window.InclusionKit.VoiceEngine`.
   * @namespace VoiceEngine
   */
  window.InclusionKit.VoiceEngine = {
    /**
     * Start continuous voice recognition.
     * Safe to call even if already listening.
     */
    startListening,

    /**
     * Stop continuous voice recognition.
     * Safe to call even if already stopped.
     */
    stopListening,

    /**
     * Toggle listening state — convenience wrapper used by the UI button.
     */
    toggleListening,

    /**
     * Speak a string aloud via the Web Speech Synthesis API.
     * Cancels any in-progress speech before starting.
     * @param {string} text - Text to speak.
     */
    speak,

    /**
     * Enables point-to-speak hover reading mode.
     */
    enableHoverRead,

    /**
     * Disables point-to-speak hover reading mode.
     */
    disableHoverRead,

    /**
     * Toggles point-to-speak hover reading mode.
     */
    toggleHoverRead,

    /**
     * @type {boolean} Whether voice recognition is currently active.
     */
    get isListening() {
      return isListening;
    },

    /**
     * @type {boolean} Whether hover-to-read mode is active.
     */
    get isHoverReadMode() {
      return isHoverReadMode;
    },

    /**
     * @type {boolean} Whether the browser supports SpeechRecognition.
     */
    get isSupported() {
      return isSupported;
    },
  };

  console.log('[VoiceEngine] Initialised. Browser support:', isSupported);
});
