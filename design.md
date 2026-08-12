# Design — Fitness Analytics

A locked design system for this personal mobile dashboard. Every page and
component should preserve the same visual language. Extend this file when the
system needs to grow; do not invent page-local themes.

## Genre

Modern-minimal, tuned toward a soft and exact personal-health interface.

## Macrostructure family

- Marketing pages: not applicable. This product has no marketing surface.
- App pages: Stat-Led. Real measurements lead; controls and charts qualify them.
- Content pages: Long Document, only if a settings or help route is added later.

## Theme

- `--color-paper`: oklch(0.972 0.008 250)
- `--color-paper-2`: oklch(0.995 0.004 250)
- `--color-paper-3`: oklch(0.944 0.012 250)
- `--color-ink`: oklch(0.19 0.014 250)
- `--color-ink-2`: oklch(0.3 0.014 250)
- `--color-rule`: oklch(0.875 0.012 250)
- `--color-rule-2`: oklch(0.79 0.014 250)
- `--color-control-border`: oklch(0.66 0.014 250)
- `--color-muted`: oklch(0.46 0.014 250)
- `--color-neutral`: oklch(0.36 0.016 250)
- `--color-accent`: oklch(0.52 0.19 253)
- `--color-focus`: oklch(0.48 0.22 253)

The primary accent is blue. Additional chart colours are semantic data encodings,
not decorative accents, and remain confined to marks, progress rings, and active
indicators.

## Typography

- Display: Geist Sans, weight 700, style normal
- Body: Geist Sans, weight 400
- Numeric outlier: Geist Mono, weight 600
- Display tracking: -0.035em
- Type scale anchor: `--text-display = clamp(2.75rem, 13vw, 4.25rem)`

## Spacing

4-point named scale. Values live in `tokens.css`. Components use named tokens,
never raw spacing values. The base layout is designed for 320–414 px and stays
mobile-width at larger viewports.

## Motion

- Easings: `--ease-out`, `--ease-in`, and `--ease-in-out` from `tokens.css`
- Progress rings and pressed controls communicate state changes
- No page-load or scroll-linked reveals on mobile
- Reduced motion: spatial transitions removed, functional state remains

## Microinteractions stance

- Silent success
- Minimum 44 × 44 CSS px touch targets
- Focus rings appear instantly
- Hover styling exists only for fine pointers and always has a tap/focus equivalent

## CTA voice

- This dashboard has no marketing CTA.
- Metric selectors use soft filled segments with persistent pressed state.

## Per-page allowances

- App pages must not use decorative enrichment; data visualisation carries the UI.
- Notion may be named only as a quiet data-source status, never as promotion.
- Empty and error states remain operational and specific.

## What pages MUST share

- Cool, softly tinted paper and white-tinted raised surfaces
- Geist Sans UI and Geist Mono measurements
- Blue interaction accent and semantic data colours
- Rounded 16–24 px panels with restrained borders and one whisper shadow
- Mobile-width composition and safe-area padding

## What pages MAY differ on

- Which real measurement leads the first viewport
- Chart type when the underlying data requires it
- Section order when a new workflow has a clearer task sequence

## Exports

### tokens.css

```css
:root {
  --color-paper: oklch(0.972 0.008 250);
  --color-paper-2: oklch(0.995 0.004 250);
  --color-paper-3: oklch(0.944 0.012 250);
  --color-ink: oklch(0.19 0.014 250);
  --color-ink-2: oklch(0.3 0.014 250);
  --color-rule: oklch(0.875 0.012 250);
  --color-rule-2: oklch(0.79 0.014 250);
  --color-control-border: oklch(0.66 0.014 250);
  --color-muted: oklch(0.46 0.014 250);
  --color-neutral: oklch(0.36 0.016 250);
  --color-accent: oklch(0.52 0.19 253);
  --color-accent-ink: oklch(0.985 0.006 250);
  --color-focus: oklch(0.48 0.22 253);

  --font-display: var(--font-geist-sans);
  --font-body: var(--font-geist-sans);
  --font-outlier: var(--font-geist-mono);

  --space-3xs: 0.125rem;
  --space-2xs: 0.25rem;
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --space-2xl: 4rem;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.25rem;
  --text-lg: 1.5625rem;
  --text-xl: 1.953rem;
  --text-display: clamp(2.75rem, 13vw, 4.25rem);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 420ms;

  --radius-card: 1.25rem;
  --radius-pill: 999px;
  --radius-input: 0.875rem;
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(0.972 0.008 250);
  --color-paper-2: oklch(0.995 0.004 250);
  --color-paper-3: oklch(0.944 0.012 250);
  --color-rule: oklch(0.875 0.012 250);
  --color-rule-2: oklch(0.79 0.014 250);
  --color-control-border: oklch(0.66 0.014 250);
  --color-muted: oklch(0.46 0.014 250);
  --color-neutral: oklch(0.36 0.016 250);
  --color-ink-2: oklch(0.3 0.014 250);
  --color-ink: oklch(0.19 0.014 250);
  --color-accent: oklch(0.52 0.19 253);
  --color-focus: oklch(0.48 0.22 253);
  --font-display: var(--font-geist-sans);
  --font-body: var(--font-geist-sans);
  --font-outlier: var(--font-geist-mono);
  --spacing-3xs: 0.125rem;
  --spacing-2xs: 0.25rem;
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2.5rem;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-md: 1.25rem;
  --text-lg: 1.5625rem;
  --text-xl: 1.953rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --radius-card: 1.25rem;
  --radius-pill: 999px;
  --radius-input: 0.875rem;
}
```

### DTCG tokens.json

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(0.972 0.008 250)", "$type": "color" },
    "paper-2": { "$value": "oklch(0.995 0.004 250)", "$type": "color" },
    "paper-3": { "$value": "oklch(0.944 0.012 250)", "$type": "color" },
    "ink": { "$value": "oklch(0.19 0.014 250)", "$type": "color" },
    "ink-2": { "$value": "oklch(0.3 0.014 250)", "$type": "color" },
    "rule": { "$value": "oklch(0.875 0.012 250)", "$type": "color" },
    "control-border": { "$value": "oklch(0.66 0.014 250)", "$type": "color" },
    "muted": { "$value": "oklch(0.46 0.014 250)", "$type": "color" },
    "accent": { "$value": "oklch(0.52 0.19 253)", "$type": "color" },
    "focus": { "$value": "oklch(0.48 0.22 253)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Geist Sans", "$type": "fontFamily" },
    "body": { "$value": "Geist Sans", "$type": "fontFamily" },
    "outlier": { "$value": "Geist Mono", "$type": "fontFamily" }
  },
  "space": {
    "xs": { "$value": "0.5rem", "$type": "dimension" },
    "sm": { "$value": "0.75rem", "$type": "dimension" },
    "md": { "$value": "1rem", "$type": "dimension" },
    "lg": { "$value": "1.5rem", "$type": "dimension" },
    "xl": { "$value": "2.5rem", "$type": "dimension" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 0.972 0.008 250;
  --foreground: 0.19 0.014 250;
  --card: 0.995 0.004 250;
  --card-foreground: 0.19 0.014 250;
  --popover: 0.995 0.004 250;
  --popover-foreground: 0.19 0.014 250;
  --primary: 0.52 0.19 253;
  --primary-foreground: 0.985 0.006 250;
  --secondary: 0.944 0.012 250;
  --secondary-foreground: 0.3 0.014 250;
  --muted: 0.875 0.012 250;
  --muted-foreground: 0.46 0.014 250;
  --accent: 0.52 0.19 253;
  --accent-foreground: 0.985 0.006 250;
  --destructive: 0.56 0.2 28;
  --destructive-foreground: 0.985 0.006 250;
  --border: 0.875 0.012 250;
  --input: 0.875 0.012 250;
  --ring: 0.48 0.22 253;
  --radius: 1.25rem;
}
```
