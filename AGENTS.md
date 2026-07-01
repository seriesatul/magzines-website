<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# AGENTS.md — Hearts & Beans
# Read this file before writing ANY frontend code.
# These are non-negotiable design rules.

## THE DESIGN LANGUAGE — Editorial Magazine Aesthetic

Hearts & Beans is a premium magazine printing brand.
The UI must feel like a high-end editorial magazine website — think VERTICAL, Vogue, AnOther Magazine.
NOT a generic SaaS app. NOT a Tailwind UI template. NOT a standard e-commerce store.

The feeling: **bold typography, generous whitespace, cinematic photography, purposeful motion.**

---

## TYPOGRAPHY — The Most Important Thing

Typography IS the design. Get this wrong and the whole site looks cheap.

### Font Stack
```
Serif (headings, display):   "Playfair Display", Georgia, serif
  — import from Google Fonts: weights 400, 700, 900 + italic variants
  — This gives the editorial italic + bold serif mix seen in magazines

Sans (body, UI, labels):     "DM Sans", system-ui, sans-serif
  — import from Google Fonts: weights 300, 400, 500
  — Clean, modern, readable at small sizes

Italic accent (pull quotes, subheadings):  "Playfair Display" italic
  — Used for the script/italic contrast in headings
```

### The Heading Mix Technique (CRITICAL)
The signature look is mixing upright bold serif with italic serif in ONE heading:
```
<h1>
  <span class="font-bold not-italic">Your Memories,</span>
  <span class="italic font-normal"> Beautifully Printed</span>
</h1>
```
This creates: **"Your Memories,** *Beautifully Printed*"
Use this technique on: hero headings, section titles, product names.
NEVER use all-caps headings. NEVER use a single weight for big headings.

### Type Scale
```
Display:   7rem  / 112px — hero headings, 1-2 words max, Playfair Display 900
H1:        4rem  / 64px  — page titles, Playfair Display 700
H2:        2.5rem / 40px — section titles, mixed italic technique
H3:        1.5rem / 24px — card titles, Playfair Display 400
Body:      1rem  / 16px  — DM Sans 400, line-height 1.7
Small:     0.8125rem     — DM Sans 400, labels, metadata
Micro:     0.6875rem     — uppercase, letter-spacing 0.1em, DM Sans 500
```

### Typography Rules
- Line-height on display text: 0.95 (tight, editorial)
- Line-height on body text: 1.7 (airy, readable)
- Letter-spacing on display: -0.03em (tight)
- Letter-spacing on micro labels: 0.08em (wide, uppercase)
- Max line length: 65 characters for body text (use max-w-prose or max-w-[65ch])
- Left-align almost everything. Center-align ONLY for very short decorative labels.

---

## COLOR PALETTE — Minimal, Intentional

```
Pure White:      #FFFFFF — page backgrounds, card backgrounds
Near Black:      #0A0A0A — headings, primary text (not pure #000000)
Warm Black:      #111111 — used in dark sections, footer

Brand Terracotta: #C1440E — ONE accent color, used sparingly
Brand Peach:      #F5E6DC — light tint of terracotta for hover/selection states

Stone 50:   #FAFAF8 — barely-off-white, alternate section backgrounds
Stone 200:  #E8E4DC — borders, dividers, thin lines
Stone 400:  #9C9585 — secondary text, metadata, captions
Stone 600:  #5C5750 — body text alternate

Text on dark: #F0EDE8 — warm white, used on dark/black sections
```

### Color Rules
- Use color ONLY for: brand accent (#C1440E), interactive states, status badges
- Black and white does 90% of the work
- No gradients anywhere on UI elements
- No colored backgrounds on sections except: near-black (#111111) for footer/hero overlays
- Product image backgrounds: #FAFAF8 (warm stone, never gray)

---

## LAYOUT PRINCIPLES — Asymmetric, Editorial

### Grid System
```
Desktop: 12-column grid, 24px gutters, max-width 1440px
Tablet:  8-column grid, 20px gutters
Mobile:  4-column grid, 16px gutters, 20px side padding
```

### The Editorial Layout Rules
- ASYMMETRY is intentional. Not every section is centered.
- Hero sections: image takes 60-70% of viewport, text overlaps or sits beside
- Product sections: alternating image-left / text-right layouts
- Section headings: left-aligned, oversized, break out of the grid
- Use negative space aggressively — empty space is not wasted space
- Thin horizontal rules (1px, #E8E4DC) separate sections instead of background color changes

### Section Spacing
```
Between sections: 120px desktop, 80px mobile
Inside sections:  64px desktop, 40px mobile
Card padding:     32px desktop, 20px mobile
```

---

## ANIMATIONS & INTERACTIONS — Purposeful Motion

This is what separates a premium site from a generic one.
Every animation must serve a purpose. No animation for animation's sake.

### Scroll-Triggered Reveals (REQUIRED on every page)
Use Intersection Observer API. When elements enter viewport:
```
Fade + slide up:
  initial:   opacity: 0, transform: translateY(40px)
  animated:  opacity: 1, transform: translateY(0)
  duration:  700ms
  easing:    cubic-bezier(0.16, 1, 0.3, 1)  ← smooth deceleration
  delay:     stagger children by 100ms each

Image reveal (clip-path wipe):
  initial:   clip-path: inset(0 100% 0 0)
  animated:  clip-path: inset(0 0% 0 0)
  duration:  900ms
  easing:    cubic-bezier(0.76, 0, 0.24, 1)
```

### Smooth Scroll
```css
html {
  scroll-behavior: smooth;
}
```
For programmatic scrolling, use scroll-margin-top on sections for offset.

### Cursor — Custom Magnetic Cursor (desktop only)
```
Replace default cursor with custom dot cursor:
- Small filled circle (8px) that follows mouse
- Expands to 40px ring on hover over links/buttons
- Color: #C1440E
- Transition: 100ms position, 300ms size/opacity
- Implement with useEffect tracking mousemove
```

### Hover States
```
Navigation links:
  — Underline slides in from left
  — 200ms ease-out

Product cards:
  — Image: scale(1.03) on card hover, overflow hidden, 500ms ease
  — Title: color shifts to #C1440E, 150ms
  — NO translateY lift. NO box-shadow change. Just image zoom + color.

Buttons:
  — Primary: background shifts from #C1440E to #0A0A0A, 200ms
  — Border button: background fills from left (clip-path or pseudo-element)
  — Text slides right 4px with arrow icon appearing, 200ms

Text links:
  — Underline is always visible (1px)
  — On hover: underline thickens to 2px, color to #C1440E
```

### Page Transitions (if using Next.js view transitions)
```
Page exit:  opacity 0, 200ms ease-in
Page enter: opacity 1, 300ms ease-out + translateY from 20px to 0
Use next/navigation + CSS view transitions API
```

### Loading States
```
NO skeleton loaders with shimmer
NO spinning circles
Use: content appears via scroll animation once loaded
For async data: show nothing until ready, then animate in
```

---

## COMPONENT DESIGNS

### Navigation Header
```
Layout: Horizontal top bar
Background: white, border-bottom: 1px solid #E8E4DC
Height: 72px desktop, 60px mobile
Sticky with backdrop-filter: blur(12px) and background: rgba(255,255,255,0.92)

Left: Logo — "Hearts & Beans" in Playfair Display italic, 1.25rem, #0A0A0A
Center: Nav links — DM Sans 400, 0.875rem, letter-spacing 0.02em, #5C5750
        Links: Home · Products · How It Works · Reviews
        Hover: color #0A0A0A + underline slide-in animation
Right: Cart icon (Lucide) with count badge + "Order Now" button

"Order Now" button style:
  background: #0A0A0A
  color: #FFFFFF
  padding: 10px 22px
  border-radius: 0  ← ZERO border radius, sharp rectangle
  font: DM Sans 500, 0.875rem, letter-spacing 0.04em, uppercase
  hover: background #C1440E, 200ms

Mobile: hamburger → full height side drawer from right
  Drawer background: #0A0A0A
  Links: white, Playfair Display, large (2rem), stacked vertically
  Close button: top right, white X
```

### Hero Section
```
Layout: Full viewport height (100svh)
Background: pure white

Content layout (desktop):
  Left side (50%): large editorial heading + body + CTA buttons
  Right side (50%): full-height product/lifestyle image, no border radius

Heading structure:
  Line 1: "Your Memories" — Playfair Display 900, 5rem, #0A0A0A, not italic
  Line 2: "Beautifully Printed" — Playfair Display 400, 5rem, #0A0A0A, italic
  Line 3 (optional): small label — DM Sans 500, 0.75rem, #C1440E, uppercase, letter-spacing 0.1em

Body text: DM Sans 300, 1rem, #5C5750, max-width 42ch, line-height 1.7

CTAs:
  Primary: "Browse Magazines" — black sharp rectangle button
  Secondary: "See How It Works" — text link with → arrow, #C1440E

Scroll indicator: animated down arrow at bottom center, subtle bounce

Mobile: image stacks below text, text is left-aligned
```

### Product Card
```
NO standard card with border and shadow.

Layout:
  Image: full width, aspect-ratio 3/4 (portrait, like a magazine), no border-radius
  Below image: product name (Playfair Display 400, 1.1rem) + price (DM Sans 500, #C1440E)
  Subtle metadata line: "Custom · Printed · Shipped in 5 days" — micro text, stone-400

Hover behavior:
  Image: scale(1.04), overflow hidden, 500ms ease — slow zoom
  Product name: color → #C1440E
  A thin #C1440E line (2px) slides in under the product name from left

NO "Add to Cart" button visible by default.
On hover: CTA appears — slides up from bottom of image (overlay, dark semi-transparent)
  "Order Now →" white text, black background, sharp edges

Grid:
  Desktop: 3 columns
  Tablet: 2 columns
  Mobile: 1 column with large image (feels editorial, not cramped)
```

### Section Titles
```
Pattern: mix italic + upright in same heading (as described in typography section)

Before the heading: small uppercase label in #C1440E
  "Our Collection" / "How It Works" / "What Customers Say"
  Font: DM Sans 500, 0.7rem, letter-spacing 0.12em, uppercase
  With a short 24px horizontal line before it: ————

Main heading below the label:
  Mix technique: "Our <em>Favourite</em> Magazines"
  Playfair Display, large, left-aligned

Under heading: a single thin horizontal rule full width, 1px #E8E4DC
```

### Buttons
```
Primary (filled):
  background: #0A0A0A (or #C1440E for emphasis moments)
  color: white
  padding: 14px 32px
  border-radius: 0 ← SHARP. Zero radius. This is the editorial signature.
  font: DM Sans 500, 0.875rem, letter-spacing 0.06em, uppercase
  hover: background slides to opposite color, 200ms

Secondary (outlined):
  background: transparent
  border: 1.5px solid #0A0A0A
  color: #0A0A0A
  Same padding, same zero border-radius
  hover: background #0A0A0A, color white, 200ms

Text link with arrow:
  color: #C1440E
  underline always visible
  after content: " →"
  hover: arrow moves 4px right (transform translateX), 150ms
  font: DM Sans 400, same size as surrounding text
```

### Horizontal Scrolling Product Gallery
```
On homepage: feature a horizontal scroll section
  Products scroll horizontally on desktop and mobile
  On desktop: scroll on mouse wheel (add wheel event listener)
  On mobile: native touch scroll

Implementation:
  display: flex, overflow-x: auto, scroll-snap-type: x mandatory
  Each card: scroll-snap-align: start
  Hide scrollbar: scrollbar-width: none
  Show navigation dots or "drag to explore" hint text
```

### Full-Bleed Image Sections
```
Between product and checkout sections:
  A full-width image (client's magazine photo/lifestyle image)
  Image height: 60vh on desktop, 40vh on mobile
  object-fit: cover, object-position: center
  On scroll: subtle parallax — image moves at 0.5x scroll speed
  Over image: thin white text label or none at all
```

### Reviews Section
```
Layout: NOT a grid of cards. Use an editorial list.
  Large pull quote in Playfair Display italic, 2rem
  Customer name below in DM Sans 500, small, stone-400
  A thin line separating reviews
  Photo (if provided): small circle, right-aligned, NOT left

Background: #FAFAF8 (stone-50), full-width
Navigation: left/right arrow buttons, sharp rectangle style
Animation: reviews slide horizontally on arrow click (300ms ease)
```

### Order Status Timeline
```
Vertical timeline on left side
Each step:
  Circle indicator: 12px, border 1.5px #E8E4DC, background white
  Active step: filled circle #C1440E, glowing ring animation (pulse)
  Completed: filled circle #0A0A0A with checkmark
  Connecting line: 1px dashed #E8E4DC between steps
  
Step label: DM Sans 500, 0.875rem, #0A0A0A (active) or #9C9585 (inactive)
Step date: DM Sans 400, 0.75rem, #9C9585
```

### Footer
```
Background: #0A0A0A (near black)
Text: #F0EDE8 (warm white)

Top section: Brand statement in Playfair Display italic, large, left-aligned
Middle: Links in 2-3 columns, DM Sans 300, 0.875rem, #9C9585
  Hover: color #F0EDE8, 150ms
Bottom strip: thin 1px #333 line, then copyright + social icons row
Social icons: outline style, 20px, #9C9585, hover #C1440E

"Back to Top" button: bottom right, sharp rectangle, outline white style
```

---

## WHAT CODEX MUST NEVER DO

1. NEVER use border-radius > 4px on buttons — buttons are SHARP rectangles
2. NEVER use box-shadow as a design element — no shadow-md, shadow-lg anywhere
3. NEVER use gradient backgrounds on UI elements
4. NEVER center-align body text or section headings
5. NEVER make product cards look like standard e-commerce cards (white box, shadow, rounded)
6. NEVER use blue as an interactive color — our only accent is terracotta #C1440E
7. NEVER use a single font weight for headings — always mix weights/styles
8. NEVER add animations that trigger on page load — only scroll-triggered
9. NEVER use opacity-50 disabled states — use a more intentional treatment
10. NEVER build a 3-column "icon + title + description" features section
11. NEVER use Heroicons — use Lucide React exclusively
12. NEVER make the mobile layout feel like a shrunken desktop

---

## GOOGLE FONTS IMPORT

Add this to app/layout.tsx:
```tsx
import { Playfair_Display, DM_Sans } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})
```

In tailwind.config.ts:
```ts
fontFamily: {
  serif: ['var(--font-playfair)', 'Georgia', 'serif'],
  sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
},
```

Usage in components:
```
font-serif → Playfair Display (headings, display, editorial)
font-sans  → DM Sans (body, UI, labels)
italic     → Playfair Display italic variant
```

---

## TAILWIND CONFIG — Colors and Tokens

```ts
theme: {
  extend: {
    colors: {
      brand: {
        DEFAULT: '#C1440E',
        light: '#F5E6DC',
        dark: '#8B2F08',
      },
      stone: {
        50:  '#FAFAF8',
        200: '#E8E4DC',
        400: '#9C9585',
        600: '#5C5750',
        900: '#0A0A0A',
      },
    },
    fontFamily: {
      serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      sans:  ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
    },
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '4px',
      // Do NOT use lg, xl, 2xl on buttons or cards
    },
  },
},
```

---

## BEFORE WRITING ANY COMPONENT — CHECKLIST

- [ ] Does it use Playfair Display for headings with mixed italic/bold?
- [ ] Does it use DM Sans for body/UI text?
- [ ] Are all buttons SHARP (border-radius: 0 or 2px max)?
- [ ] Is there zero box-shadow on cards?
- [ ] Is the layout asymmetric and editorial, NOT centered and symmetric?
- [ ] Do elements animate in on scroll (not on page load)?
- [ ] Is the color palette limited to black, white, stone, and #C1440E accent?
- [ ] Would this look at home on a premium magazine website?
- [ ] Would a creative director at Vogue approve this?

If any answer is "no" — stop and redesign before writing code.

---

*Typography is layout. Whitespace is design. Motion is meaning.
Build like a magazine, not like a SaaS app.*