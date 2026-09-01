# VeilPass Design System and Product-Surface Guide

**Status:** Active implementation reference
**Updated:** 1 September 2026
**Applies to:** public landing page, hosted login, App A/App B demo hosts, operator dashboard, documentation, SDK examples, and evidence pages.

## Product design read

VeilPass is a trust-first privacy developer product. Its interface should make a narrow technical promise feel inspectable: a reviewer can see where a wallet is present, where it stops, and what a host actually receives. The visual language is a restrained dark **aperture / verification bench**, not a generic crypto landing page and not an anonymity claim.

### Design dials

| Dial | Value | Rationale |
| --- | --- | --- |
| Design variance | 5/10 | Keep the existing asymmetric hero and instrument-like frames, but keep technical evidence easy to scan. |
| Motion intensity | 5/10 | Motion explains the privacy boundary and state changes; it never decorates every element. |
| Visual density | 5/10 | Marketing surfaces breathe; dashboard, docs, and error states preserve enough density for serious review. |

## Brand foundations

### Color roles

The dark system is the primary product theme. The existing `paper-theme` is reserved for printable/export contexts and must retain the same semantic roles.

| Role | Token | Value | Usage |
| --- | --- | --- |
| Canvas | `ink-950` | `#0b0f0e` | Page background and deepest product plane. |
| Elevated plane | `ink-900` | `#121615` | Inner cards, code surfaces, form wells. |
| Structural plane | `ink-800` | `#1b211f` | Hover/secondary controls only. |
| Primary text | `paper-50` | `#f5f2e9` | Headings, essential values. |
| Secondary text | `paper-200` | `#d8d6cd` | Explanatory text; never below WCAG AA. |
| Signal accent | `signal-400` | `#b9f5d0` | Success, focus, primary action, verified state. |
| Alert accent | `alert-400` | `#ff8f78` | Rejection/error only; not marketing decoration. |
| Structural line | `line-dark` | `#2a312f` | Dividers and low-emphasis boundaries. |

Rules:

- Use **one accent family per surface**: signal green for positive/action, alert coral only for rejected states.
- Do not add blue/purple AI glows, rainbow gradients, or a competing accent.
- The wallet icon/address must be visually confined to the enrollment/standard-wallet comparison context. Never use it as a decorative proof of privacy.

### Typography

| Role | Font | Usage |
| --- | --- | --- |
| Display and interface | Instrument Sans | Product headings, body, controls. |
| Technical values | IBM Plex Mono | IDs, origins, timestamps, code, public inputs, event/transaction references. |

Rules:

- Heading copy is direct and short. Avoid poetic claims, invented metrics, and “anonymous/untraceable” wording.
- Use `tracking-[-0.04em]` to `tracking-[-0.07em]` only on large display headings. Normal body text must remain comfortably readable.
- Code surfaces are readable at 12–14 px with horizontal scroll; they never force page overflow.

### Shape and depth

| Element | Outer | Inner | Rule |
| --- | --- | --- | --- |
| Major proof/product frame | `rounded-[1.75rem]` to `rounded-[2.35rem]`, padded shell | `rounded-[1.3rem]` to `rounded-[1.85rem]` | Use the existing double-bezel construction. |
| Standard card | `rounded-[1.5rem]` shell | `rounded-[1.1rem]` core | Use only for a distinct interaction or state cluster. |
| Button | full pill | optional nested icon island | Primary action has dark icon island; secondary action has visible border. |
| Form control | `rounded-xl` | — | Labels above controls; errors below them. |

Depth is formed through nested planes, low-opacity signal borders, and tinted shadows. Avoid generic medium shadows and large blurred surfaces in scrolling content.

## Layout system

### Shells and responsive behavior

- Public sections use `max-w-7xl` with 16/24/32 px horizontal gutters by breakpoint.
- Documentation uses a narrower reading column and a stable technical navigation column at desktop.
- Multi-column product layouts collapse deliberately below 768 px into one column. Never rely on clipped overlap or visual-only order to preserve meaning.
- Use `min-h-[100dvh]`, never `h-screen`, for immersive content.
- Navigation remains a detached floating island, with a desktop height of 64–72 px and a full-width mobile menu. No two-line desktop nav.

### Page-specific composition

| Surface | Composition | Required content |
| --- | --- | --- |
| Landing | Editorial split: proof claim left, live product evidence right | Exact privacy claim, product status, one primary CTA, one secondary CTA, evidence links. |
| Hosted login | Single focused proof panel | Host origin, gate, credential status, proof state, privacy disclosure, clear reject/retry outcome. |
| App A/App B | Independent host identity panels | Their own origin, session state, received minimized payload, no wallet address. |
| Dashboard | Dense operator workspace | Live gate state, configuration health, transaction/result states, non-destructive action confirmation. |
| Documentation | Reader-first technical page | Version/status callout, example, API/error details, limitations near the relevant claim. |

## Product state language

Every user-visible status must use the same vocabulary across pages, SDK examples, and evidence.

| State | Label pattern | Visual treatment | Required action |
| --- | --- | --- | --- |
| Ready | `Ready to verify` | signal text and quiet border | Explain next user action. |
| In progress | `Creating proof…` | skeleton/progress copy; no fake percentage | Keep control disabled only when necessary. |
| Verified | `Verified for this host` | signal badge + minimized payload | Offer session continuation. |
| Rejected | public error code plus plain-language reason | alert badge + concise reason | Explain whether fresh challenge/re-enrollment is needed. |
| Unavailable | `Verification unavailable` | neutral/alert state | Do not imply credential failure; offer safe retry. |
| Simulation | `Prototype simulation` | persistent, unmistakable caution treatment | Never use the word “verified” as a cryptographic claim. |

## Motion specification

Motion is an explanation tool. It communicates (1) a boundary forming around a host response, (2) a proof/session state transition, and (3) a reviewer progressing through evidence. It does not run forever across every card.

### Motion layers

1. **CSS/Motion reveal:** existing route and in-view reveal behavior for static sections. Transform, opacity, and limited blur only.
2. **GSAP timeline:** an isolated client component may sequence the proof journey or evidence stages when a reviewer scrolls through a purposeful timeline. Use GSAP only where timing/order carries meaning; use `gsap.context()` and cleanup on unmount.
3. **Reduced motion:** all motion collapses to its final static state under `prefers-reduced-motion: reduce`. No pinned scroll, scans, or repeated drift.

### GSAP guardrails

- Install/import only `gsap` and, when React lifecycle support is needed, `@gsap/react`.
- Register `ScrollTrigger` once in a client-only leaf. Never add window scroll listeners or place scroll progress in React state.
- Animate transform and opacity only. Do not animate width, height, top, or left.
- Use a single GSAP-scrolled story per page at most. Product flow will use a horizontal/pinned sequence only if it improves the reviewer journey; docs and dashboard remain conventional.
- Respect a maximum first-load cost: GSAP component lazy-loads below the hero or only on `/demo` once it becomes a real review journey.

## Accessibility and trust requirements

- Text, focus ring, controls, alerts, and code blocks meet WCAG AA contrast in both dark and paper contexts.
- Every icon-only control has an accessible name. Use the existing Phosphor icon family; do not introduce another icon library casually.
- “Wallet address withheld” claims must be paired with an accurate limitation: the issuer sees the address at enrollment; IP/device/timing are not hidden.
- Popup, sheet, and dialog focus behavior must be keyboard-tested. Errors are announced with `aria-live` without exposing secrets.
- The UI must not display or log wallet addresses on host surfaces. Development fixtures are labelled clearly and excluded from production evidence.

## Content and claim governance

The landing page, README, schema.org metadata, dashboard, docs, and demo must draw from the same product-status source.

| Capability state | Allowed wording | Disallowed wording |
| --- | --- | --- |
| ZK circuit source only | `Noir circuit design is included; production proving is in progress.` | `ZK login is live.` |
| Simulator | `Prototype simulation` | `Proof verified` or `private ZK login`. |
| Real proof + verifier | `Proof verified for this host and gate.` | `Anonymous` or `untraceable`. |
| Two host apps | `Different host origins receive different scoped IDs.` | `Two apps` when they are only tabs/states in one origin. |
| Testnet | `Stellar Testnet` | `Production-ready`, `mainnet-ready`, or `audited` without evidence. |

## Implementation checklist

- [ ] `app/page.tsx`, social metadata, README, and docs use status-derived claims rather than static promise copy.
- [ ] Real App A and App B share visual DNA but carry their own host identities and session states.
- [ ] Dashboard uses real transaction status, not “simulate” wording once sign-and-send is implemented.
- [ ] Each form supports loading, success, reject, unavailable, and accessible retry states.
- [ ] Any GSAP scene follows the motion guardrails above and is covered by reduced-motion E2E.
- [ ] Responsive desktop/mobile screenshots are regenerated from the implementation, not manually composed.
- [ ] A design review checks color, control contrast, copy, focus states, and overflow at 320 px, 768 px, and 1440 px.
