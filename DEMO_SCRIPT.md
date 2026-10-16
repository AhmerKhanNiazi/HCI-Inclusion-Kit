# 🎬 InclusionKit — Mukammal Live Demo Script
**Student:** Ahmer Khan Niazi | **Course:** HCI 5th Semester  
**Live URL:** https://ahmerkhanniazi.github.io/HCI-Inclusion-Kit/  
**Topics:** Topic 3 (Inclusive Design) & Topic 8 (Visual Haptic Emulation)

> **Before presenting:** Open the live URL in Chrome or Edge. Make sure sound is ON for audio tick demo.  
> **Hard refresh if needed:** `Ctrl + Shift + R`

---

## ⌨️ MASTER SHORTCUT TABLE (Yaad Kar Lo)

| Shortcut | Kaam | WCAG Rule |
|:---|:---|:---|
| **`Alt + A`** | Adaptability Engine (Dock) open / close | WCAG 2.1.1 |
| **`Alt + I`** | WCAG Inspector on / off | WCAG 4.1.2 |
| **`Alt + V`** | Viva Cheat Sheet modal open | Educational |
| **`Alt + R`** | Tamam settings reset to default | UX Best Practice |
| **`Tab`** | Agla interactive element | WCAG 2.1.1 |
| **`Shift + Tab`** | Pichla element (reverse) | WCAG 2.1.1 |
| **`Arrow Keys`** | Swatches & tabs ke andar navigate | WAI-ARIA Pattern |
| **`Escape`** | Koi bhi drawer / modal band karo | WCAG 2.1.2 |
| **`Enter` / `Space`** | Button activate + haptic spring + audio tick | Topic 8 |

---

## DEMO ORDER — Yeh Sequence Follow Karo

---

## ➊ PAGE LOAD — Skip Link (WCAG 2.4.1 — Level A)

**Karna kiya hai:**
1. Website kholo
2. Mouse mat chhuo — sirf **`Tab`** key dabao

**Kiya hoga:**
- Top-left corner pe high-contrast **"Skip to main content"** link appear ho ga

**Bolna:**
> *"Sir, yeh WCAG 2.4.1 Bypass Blocks hai. Keyboard-only aur screen reader users directly main content par ja sakte hain bina poora header bar-bar traverse kiye. Yeh Level A requirement hai."*

---

## ➋ ADAPTABILITY ENGINE DOCK KHOLNA

**2 tareeqe hain:**

| Method | Action |
|:---|:---|
| Mouse | Bottom-right blue **♿ floating button** click karo |
| Keyboard | **`Alt + A`** |

**Kiya hoga:**
- Right side se ek dock panel slide in ho ga
- 4 tabs dikhenge: **🎨 Vision · 🔤 Type · 📳 Haptic · 🎓 Viva**
- Focus automatically pehle button par chala jata hai

**Bolna:**
> *"Accessibility toolbar ko khud mouse se dhoondhna accessibility ka anti-pattern hai. Is liye Alt+A global shortcut diya hai — WCAG 2.1.1 Keyboard Accessible. Dock kholte hi focus automatically andar chala jata hai — WCAG 2.4.3 Focus Order compliance."*

---

## ➌ 🎨 VISION TAB — Colorblindness Simulation

**"Vision" tab already active hoga**

---

### A) Achromatopsia (Total Colorblindness)

**Karna kiya hai:**
- `Achromatopsia (Grayscale)` button click karo

**Kiya hoga:**
- Poori website grayscale ho jaye gi — koi rang nahi

**Product swatches ki taraf point karo aur bolna:**
> *"Rang bilkul khatam ho gaya. Lekin user ab bhi har finish pehchan sakta hai kyunke hum ne WCAG 1.4.1 Use of Color ka rule follow kiya hai — color ke sath alag geometric shape (● Circle, ■ Square, ▲ Triangle, ◆ Diamond) aur text label bhi diya hai."*

---

### B) Protanopia (Red-Blind)

**Karna kiya hai:**
- `Protanopia` button click karo

**Kiya hoga:**
- Red colors dark brownish ho jate hain

**Bolna:**
> *"L-cone photoreceptor defect — approximately 1% mardo mein hoti hai. SVG feColorMatrix ke zariye mathematically simulate kar rahe hain — zero external library."*

---

### C) Deuteranopia (Green-Blind)

**Karna kiya hai:**
- `Deuteranopia` button click karo

**Bolna:**
> *"M-cone defect — sabse common CVD, 5% males. Red aur green confuse ho jate hain."*

---

### D) High Contrast AAA Mode

**Karna kiya hai:**
- `High (AAA)` contrast button click karo

**Kiya hoga:**
- Background pitch black, text high-visibility yellow

**Bolna:**
> *"Yeh 18:1 luminance contrast ratio provide karta hai — WCAG 1.4.6 Level AAA se bhi aage. Low vision aur cataracts wale users ke liye."*

---

### E) Reset

- **`Alt + R`** dabao — sab normal ho jata hai
- Screen edge recoil flash confirm karta hai reset

---

## ➍ 🔤 TYPE TAB — Dyslexia & Reading Adaptation

**Dock mein "🔤 Type" tab click karo**

---

### A) OpenDyslexic Font

**Karna kiya hai:**
- `OpenDyslexic` button click karo

**Kiya hoga:**
- Website ka saara text OpenDyslexic mein badal jata hai

**Bolna:**
> *"Standard fonts mein b, d, p, q letters ek doosre ke mirror hote hain. Dyslexia wale users ke liye yeh rotate aur swap dikhte hain. OpenDyslexic har glyph ke bottom ko heavy banata hai — optical gravity line create karta hai jo letter ko ulta nahi dikhne deti."*

---

### B) Text Scale 150%

**Karna kiya hai:**
- `150%` button click karo

**Kiya hoga:**
- Saara text bada ho jata hai, layout nahi tuta

**Bolna:**
> *"WCAG 1.4.4 Resize Text Level AA — content 200% tak scale ho sake bina horizontal scroll ya clipping ke. Hum CSS custom property `--font-scale` ko dynamically change karte hain."*

---

### C) Wide Letter Spacing

**Karna kiya hai:**
- `Wide (+0.08em)` spacing button click karo

**Kiya hoga:**
- Letters ke darmiyan space barh jati hai

**Bolna:**
> *"WCAG 1.4.12 Text Spacing Level AA — letter spacing 0.12x font size honi chahiye. Yeh dyslexia mein letter crowding kam karta hai."*

---

### D) Reading Guide Ruler

**Karna kiya hai:**
- `Reading Guide Ruler` toggle switch on karo
- Mouse ko product description text par slow move karo

**Kiya hoga:**
- Yellow dashed strip cursor ke sath move karti hai, surrounding text dim ho jata hai

**Bolna:**
> *"ADHD aur dyslexia wale users barha padte waqt lines skip kar dete hain. Yeh ruler active line ko isolate karta hai."*

---

### E) Reduced Motion

**Karna kiya hai:**
- `Reduced Motion` toggle on karo

**Bolna:**
> *"WCAG 2.3.3 Animation from Interactions Level AAA — vestibular disorder wale users ke liye decorative animations completely suppress ho jati hain."*

---

### F) Atkinson Hyperlegible Font (Bonus)

**Karna kiya hai:**
- Font section mein `Atkinson Hyperlegible` click karo

**Bolna:**
> *"Braille Institute ka banaya hua font — har letterform deliberately distinct hai ताकि low-vision users I, l, 1, O, 0 confuse na karein."*

---

## ➎ 📳 HAPTIC TAB — Topic 8 Visual Tactile Emulation

**Dock band karo (`Escape`), phir product page par kaam karo**

---

### A) Quantity Boundary Recoil — MAIN DEMO

**Karna kiya hai:**
1. Product card mein Quantity `+` button click karo — 1, 2, 3, 4, **5**
2. 5 pe pohanchne ke baad **ek aur `+` click karo**

**Kiya hoga:**
- Screen ke edges par **blue shockwave flash** aata hai
- Subtle **micro-tick sound** aati hai (Web Audio)
- Quantity 5 se upar nahi jata

**Bolna:**
> *"Topic 8: Jab physical device mein slider end pe pohanchta hai to motor recoil hoti hai. Web browser mein hardware nahi hai, to hum CSS flash animation + Web Audio API 12ms oscillator se dual-modal tactile feedback emulate karte hain. Zero sound files, zero mics."*

---

### B) Spring Compression — Every Button Click

**Karna kiya hai:**
- Koi bhi button (Add to Cart, swatches, tabs) dhyan se click karo

**Kiya hoga:**
- Button click ke waqt slight squash (0.94×) phir spring back (1.03×) hota hai
- Expanding ripple wave click point se bahar nikalta hai

**Bolna:**
> *"Mechanical switch ka 'travel' — physical depression aur spring release. `.tactile-bump` CSS keyframe aur `.haptic-ripple` radial wave se implement kiya."*

---

### C) Focus Ring Themes — Keyboard Users

**`Alt + A`** → **Haptic Tab** → Focus Ring Themes

**Karna kiya hai:**
- `High-Vis Yellow` click karo
- Dock band karo (`Escape`)
- Tab key dabate raho

**Kiya hoga:**
- Har button pe bright yellow pulsating glow ring aata hai

**Bolna:**
> *"WCAG 2.4.11 Focus Appearance Level AAA — focus ring minimum 3:1 contrast against adjacent colors. Pulsating animation Topic 8 tactile feedback ka visual extension hai."*

---

## ➏ 🛒 PRODUCT & CART DEMO

### A) Product Swatch Selection

**Karna kiya hai:**
- Mouse se ya **Arrow Keys** se swatches switch karo: Obsidian → Coral → Azure → Chalk

**Kiya hoga:**
- Product image instantly change ho jata hai
- Top label update hota hai
- ARIA state `aria-checked="true"` moves with selection

**Bolna:**
> *"WAI-ARIA radiogroup pattern — keyboard arrow navigation, screen reader announces selected finish with shape identifier. WCAG 2.1.1 compliant."*

---

### B) Add to Cart → Cart Drawer

**Karna kiya hai:**
1. Quantity `2` set karo
2. Finish `Coral Sunrise` select karo
3. **"Add to Cart"** click karo

**Kiya hoga:**
- Cart drawer right side se slide in ho ga
- Item ki image, naam, shape label, qty, price dikhega
- Subtotal auto-calculate ho ga
- Header cart icon pe badge counter update ho ga

**Drawer ke andar demo karo:**
- `–` button → qty kam hoti hai
- `+` button → qty barhti hai
- 🗑 Remove → item hata jata hai, cart empty state dikhta hai
- **Checkout** → cart band ho kar checkout modal khulta hai

**Bolna:**
> *"Cart drawer accessible dialog pattern implement karta hai — WCAG 2.1.2 No Keyboard Trap, focus trap inside drawer, Escape se band."*

---

## ➐ ACCESSIBLE CHECKOUT FORM — WCAG 3.3.1

**"Checkout Now" button click karo**

---

### A) Error Identification Demo

**Karna kiya hai:**
- Saare fields BILKUL BLANK rakhna
- **"Confirm & Place Order"** click karo

**Kiya hoga:**
- Name field: red border, red background, error message neeche
- Email field: same
- Address field: same
- Focus automatically **pehle error field** par chali jati hai
- Screen reader error announce karta hai

**Bolna:**
> *"WCAG 3.3.1 Error Identification Level A — har invalid field programmatically identified hai with `aria-invalid='true'` aur `aria-describedby` se error message link kiya gaya hai. User ko guess nahi karna parta ke kya galat hua."*

---

### B) Valid Submission Demo

**Karna kiya hai:**
- Name: `Ahmer Khan`
- Email: `ahmer@gmail.com`
- Address: `House 5, Block B, Karachi`
- Payment: already selected
- **"Confirm & Place Order"** click karo

**Kiya hoga:**
- Green ✓ success view appear hota hai
- "Return to Store" button pe focus jata hai

**Bolna:**
> *"WCAG 3.3.4 Error Prevention — confirmation screen shows before destructive action, user can close and review."*

**Escape dabao** — focus wapas "Checkout Now" button par — WCAG 2.4.3

---

## ➑ WCAG INSPECTOR — Viva Tool

**Karna kiya hai:**
- **`Alt + I`** ya header mein **"WCAG Inspector"** button

**Kiya hoga:**
- Poora interface blue dashed outline mein aa jata hai

**Ab elements pe hover karo:**

| Element | Criterion Dikhega |
|:---|:---|
| Price / Sale Badge | 1.4.3 Minimum Contrast |
| Product Swatches | 1.4.1 Use of Color |
| + / − Quantity Buttons | 2.5.5 Target Size (44px) |
| Checkout Button | 2.1.1 Keyboard Accessible |
| Banner Section | 1.4.3 Contrast |
| Add to Cart Button | Topic 8 Visual Haptic |

**Kisi bhi element pe CLICK karo** → detailed modal aata hai with viva talking points

---

## ➒ 🎓 VIVA CHEAT SHEET

**Karna kiya hai:**
- **`Alt + V`** ya header mein **"🎓 Viva Cheat Sheet"**

**Kiya hoga:**
- Full screen modal:
  - POUR Framework (Perceivable, Operable, Understandable, Robust)
  - WCAG contrast formula
  - Topic 8 cross-modal substitution explanation
  - Step-by-step examiner demonstration script

---

## ➓ FULL RESET

**Karna kiya hai:**
- **`Alt + R`**

**Kiya hoga:**
- Saari settings (font, filter, contrast, spacing, haptics) ek second mein defaults par
- Screen edge flash confirm karta hai
- localStorage clear ho jata hai

---

## 📋 TEACHER KO KIYA BOLNA HAI — 2 Minute Pitch

> *"Sir/Ma'am, InclusionKit HCI ke Topic 3 aur Topic 8 ko demonstrate karta hai.*
>
> *Topic 3 mein humne WCAG 2.1 ke charo pillars implement kiye hain:*
> *— Perceivable: SVG colorblindness filters, multi-cue swatches, high contrast*
> *— Operable: Full keyboard navigation, skip links, 44px touch targets*
> *— Understandable: Real-time form validation, reading ruler, dyslexia font*
> *— Robust: WAI-ARIA roles, live regions, semantic HTML5*
>
> *Topic 8 mein humne flat screen pe physical tactile feedback emulate kiya hai:*
> *Mechanical spring compression, radial wave dispersion, boundary recoil flash, aur*
> *synthetic Web Audio tick — sab kuch sirf CSS animations aur browser JavaScript se,*
> *zero external hardware, zero cameras, zero microphones.*
>
> *Yeh GitHub Pages par freely accessible hai aur kisi bhi device par chalti hai."*

---

## 🐛 KNOWN FIXES APPLIED (Agar Koi Pooche)

| Bug | Fix |
|:---|:---|
| Modules DOM se pehle chalte thay | `DOMContentLoaded` wrappers add kiye |
| Cart click karta tha kuch nahi hota | Full cart drawer with item tracking implement kiya |
| `bottom-22` invalid CSS class | `bottom-[88px]` arbitrary value use ki |
| Dock inspector button wired nahi tha | `btn-trigger-inspector` class add ki |
| Haptics `undefined` tha | Lazy getter `() => window.InclusionKit.VisualHapticEngine` use ki |

---

*InclusionKit © 2026 — HCI Academic Portfolio — Ahmer Khan Niazi*
