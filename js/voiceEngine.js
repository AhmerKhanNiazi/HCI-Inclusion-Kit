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

  /** @type {boolean} Whether continuous listening is currently active. */
  let isListening = false;

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
   * Syncs all UI chrome (badge, button aria-pressed) to the current
   * `isListening` value.
   */
  function syncUI() {
    if (badgeEl) {
      badgeEl.hidden = !isListening;
      badgeEl.setAttribute('aria-hidden', String(!isListening));
    }
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(isListening));
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
   * Cycles the font scale up through the progression 1.0 → 1.1 → 1.2 → 1.3 → 1.0.
   * Reads the current value from State (if available) and increments it.
   */
  function cycleFontScaleUp() {
    if (!State) return;
    const steps = [1.0, 1.1, 1.2, 1.3];
    const current = State.get ? State.get('fontScale') : 1.0;
    const idx = steps.indexOf(Number(current));
    const next = steps[(idx + 1) % steps.length];
    State.set('fontScale', next);
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
   * 7. Command parser
   * ───────────────────────────────────────────────────────────────────────── */

  /**
   * @typedef {Object} VoiceCommand
   * @property {string[]} patterns  - Substrings that trigger this command (case-insensitive).
   * @property {Function} action    - Handler executed when a pattern matches.
   */

  /**
   * Ordered list of recognised voice commands.
   * Matching uses fuzzy substring detection (case-insensitive).
   * The first matching command wins.
   *
   * @type {VoiceCommand[]}
   */
  const COMMANDS = [
    // ── Contrast ──────────────────────────────────────────────────────────
    {
      patterns: ['high contrast', 'enable contrast'],
      action() {
        State?.set('contrastMode', 'high');
        speak('High contrast mode enabled');
      },
    },
    {
      patterns: ['normal contrast', 'disable contrast', 'reset contrast'],
      action() {
        State?.set('contrastMode', 'normal');
        speak('Normal contrast restored');
      },
    },
    // ── Font size ──────────────────────────────────────────────────────────
    {
      patterns: ['increase font', 'bigger text', 'larger font'],
      action() {
        cycleFontScaleUp();
        speak('Font increased');
      },
    },
    {
      patterns: ['reset font', 'normal font'],
      action() {
        State?.set('fontScale', 1.0);
        speak('Font reset to normal');
      },
    },
    // ── Colour filters ─────────────────────────────────────────────────────
    {
      patterns: ['colorblind', 'protanopia'],
      action() {
        State?.set('colorFilter', 'protanopia');
        speak('Protanopia colorblind filter active');
      },
    },
    {
      patterns: ['deuteranopia'],
      action() {
        State?.set('colorFilter', 'deuteranopia');
        speak('Deuteranopia filter active');
      },
    },
    {
      patterns: ['grayscale'],
      action() {
        State?.set('colorFilter', 'grayscale');
        speak('Grayscale mode active');
      },
    },
    {
      patterns: ['normal color', 'no filter', 'clear filter'],
      action() {
        State?.set('colorFilter', 'none');
        speak('Color filters cleared');
      },
    },
    // ── Page reading ───────────────────────────────────────────────────────
    {
      patterns: ['read page', 'page summary'],
      action() {
        speak(buildPageSummary());
      },
    },
    // ── Inspector ──────────────────────────────────────────────────────────
    {
      patterns: ['open inspector'],
      action() {
        State?.set('inspectorActive', true);
        speak('WCAG inspector opened');
      },
    },
    // ── Dialog close ───────────────────────────────────────────────────────
    {
      patterns: ['close dialog', 'close', 'escape'],
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
        speak('Dialog closed');
      },
    },
    // ── Acoustic / sound ───────────────────────────────────────────────────
    {
      patterns: ['play sound', 'focus sound'],
      action() {
        window.InclusionKit?.AcousticEngine?.playChime();
        speak('Focus chime played');
      },
    },
    {
      patterns: ['mute audio', 'mute'],
      action() {
        State?.set('hapticSound', false);
        speak('Audio muted');
      },
    },
    {
      patterns: ['unmute audio', 'unmute'],
      action() {
        State?.set('hapticSound', true);
        speak('Audio enabled');
      },
    },
    // ── Navigation shortcuts ───────────────────────────────────────────────
    {
      patterns: ['open cart'],
      action() {
        document.getElementById('header-cart-btn')?.click();
        speak('Cart opened');
      },
    },
    // ── Help ───────────────────────────────────────────────────────────────
    {
      patterns: ['help'],
      action() {
        document.querySelector('.btn-open-viva')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        speak('Opening accessibility help guide');
      },
    },
  ];

  /**
   * Attempts to match a transcript string against the known command list.
   * Uses case-insensitive substring matching ("fuzzy" intent detection).
   *
   * @param {string} transcript - Lowercased final transcript from SpeechRecognition.
   * @returns {boolean} `true` if a command was matched and executed, `false` otherwise.
   */
  function parseCommand(transcript) {
    const lower = transcript.toLowerCase().trim();
    for (const cmd of COMMANDS) {
      if (cmd.patterns.some((p) => lower.includes(p))) {
        cmd.action();
        return true;
      }
    }
    // No match — inform user.
    speak("Command not recognised. Say help for a list of commands.");
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
     * Fired when the recogniser ends unexpectedly (e.g. browser timeout).
     * Automatically restarts if the user has not manually toggled off.
     */
    rec.onend = () => {
      if (isListening) {
        // Restart automatically to maintain continuous mode.
        try {
          rec.start();
        } catch (e) {
          // Ignore "already started" errors.
        }
      }
    };

    /**
     * Fired on recogniser error. Handles common error types gracefully.
     */
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.warn('[VoiceEngine] Microphone permission denied:', event.error);
        ariaAnnounce('Microphone access denied. Please allow microphone permission.');
        stopListening();
      } else if (event.error === 'no-speech') {
        // Harmless — browser timed out waiting; onend will restart.
      } else {
        console.warn('[VoiceEngine] Recognition error:', event.error);
      }
    };

    /**
     * Fired when the recogniser begins capturing audio.
     */
    rec.onaudiostart = () => {
      // No-op — UI is updated by startListening/stopListening.
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
    if (isListening) return;

    recognition = recognition || createRecognition();
    if (!recognition) return;

    try {
      recognition.start();
      isListening = true;
      syncUI();
      ariaAnnounce('Voice recognition started. Listening for commands.');
    } catch (e) {
      console.warn('[VoiceEngine] Could not start recognition:', e);
    }
  }

  /**
   * Stops continuous voice listening and clears the transcript display.
   * Updates all UI chrome and announces via ARIA.
   */
  function stopListening() {
    if (!isListening) return;
    isListening = false;

    try {
      recognition?.stop();
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
     * @type {boolean} Whether voice recognition is currently active.
     */
    get isListening() {
      return isListening;
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
