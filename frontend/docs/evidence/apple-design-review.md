# VeilPass Apple Design review

Date: 2026-09-17  
Scope: VeilPass web application (Next.js/React) at desktop Chromium and Pixel 7 emulation widths.  
Skill: [dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill), following `SKILL.md`, the accessibility, layout, typography, color, motion, buttons, writing, branding, and Liquid Glass references.

## Summary

Overall rating: **Good**.

VeilPass has a clear thesis: prove eligibility while returning only the smallest host-scoped response. The signature element is the “aperture” payload comparison, which makes the privacy boundary observable instead of decorative. Because this is a web app, the review applies Apple’s principles and foundation guidance; native iOS/macOS conventions such as a system tab bar or menu bar are not imposed on the browser UI.

## Critical

None found in the tested surfaces. The desktop and mobile Playwright/axe runs pass without serious or critical findings, keyboard focus remains visible, and the landing flow remains usable at the tested compact and regular widths.

## Improvements applied

- **High — Accessibility and adaptability.** Primary actions use at least 48px hit regions (`min-h-12`), the mobile navigation trigger is 44px, controls have visible `focus-visible` rings, icons are marked decorative when adjacent text carries the meaning, and the UI has explicit reduced-motion and reduced-transparency fallbacks. This follows `accessibility.md › Support larger text sizes`, `accessibility.md › Offer sufficiently sized controls`, and `accessibility.md › Let people use the keyboard alone`.
- **High — Layout and safe viewport behavior.** Top-level surfaces use `100dvh`/dynamic viewport sizing, the page clips only decorative overflow, and Playwright checks both mobile and desktop horizontal overflow plus full-page scroll completion. This follows `layout.md › Adaptability` and `layout.md › Guides and safe areas`.
- **Medium — Functional glass layer.** The header is the only persistent translucent functional layer (`liquid-glass-web`); content cards remain opaque/dark enough to preserve hierarchy. `prefers-reduced-transparency: reduce` removes blur and increases surface opacity. This follows `liquid-glass.md › Use Liquid Glass for functional layers` and `layout.md › Differentiate controls from content`.
- **Medium — Content clarity.** Actions use outcome-oriented labels such as “Start enrollment”, “Open App A”, “Open docs”, and “Continue with local credential”; FAQ disclosure uses `aria-expanded` and never hides the only explanation of the privacy boundary. This follows `writing.md › Labels` and `accessibility.md › Keep actions simple and intuitive`.

## Token and contrast check

The dark web theme uses named semantic roles rather than ad-hoc colors:

| Role | Token | Hex | Contrast against primary surface |
| --- | --- | --- | ---: |
| Background | `ink-950` | `#0b0f0e` | — |
| Surface | `ink-900` | `#121615` | — |
| Primary content | `paper-50` | `#f5f2e9` | 17.23:1 on background; 16.29:1 on surface |
| Secondary content | `paper-200` | `#d8d6cd` | 13.24:1 on background; 12.52:1 on surface |
| Signal/action | `signal-400` | `#b9f5d0` | 15.64:1 on background |
| Secondary signal | `signal-600` | `#75c99a` | 9.71:1 on background |

These values exceed the 4.5:1 WCAG AA guidance for normal text cited in `accessibility.md › Strive to meet color contrast minimum standards`. Small utility labels are not the only carrier of meaning: icons, table values, text labels, and state attributes provide redundant cues.

## What works

- The privacy boundary is repeated once as a structured three-party explanation (Issuer → VeilPass login → Host dApp), which supports progressive disclosure without turning every section into a numbered tutorial.
- The payload comparison is a semantic table rather than a visual-only card grid, so screen readers receive row and column relationships.
- The FAQ is a disclosure control with one expanded answer at a time, making the long-form privacy and deployment explanations available without crowding the first viewport.
- Motion is restrained to reveal/hover transitions and the main aperture treatment; Playwright verifies the reduced-motion media query removes long transitions.

## Verification

- `npm run test:system`: 32/32 Playwright scenarios pass on Chromium and Pixel 7 emulation.
- `npm run test:a11y`: 8/8 landing, demo, dashboard, and docs scenarios pass with no serious or critical axe findings.
- `npm run test:unit`: component semantics and disclosure behavior pass.
- Visual evidence: `docs/evidence/landing-desktop.png` and `docs/evidence/demo-desktop.png`.

## Remaining platform note

The site is intentionally a responsive web experience. Browser navigation remains web navigation; the Apple skill’s native tab-bar/menu-bar requirements are therefore out of scope. If VeilPass later ships as a native iOS, iPadOS, or macOS client, repeat this review with the platform-specific navigation, safe-area, Dynamic Type, VoiceOver, and window references.
