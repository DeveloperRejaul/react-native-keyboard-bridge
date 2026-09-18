# ADR-001: iOS Custom Keyboard Extension does not embed a live JS runtime

## Status
**Superseded by [ADR-005](ADR-005-ios-mini-js-runtime.md).** Kept for history —
the memory/App-Review context below is still the reasoning ADR-005's "why not
full React Native" section builds on; only the "no JS runtime at all"
conclusion changed, after being raised with the maintainer as this ADR
required.

## Context
Apple imposes a strict memory ceiling on Custom Keyboard Extensions
(roughly 30-60MB, and the exact number is not publicly documented or
guaranteed stable across iOS versions). Embedding Hermes/JSC plus the React
Native bridge inside the extension process is possible in principle, but the
extra footprint makes the extension liable to be killed by the OS under
memory pressure. A keyboard extension crashing is a severe UX failure: it
breaks the user's ability to type system-wide, not just within one app.

## Decision
The iOS extension does not run React Native at runtime. Instead:
1. `packages/core`'s JSX -> JSON compiler (Phase 4) compiles the developer's
   keyboard JSX into the shared `KeyLayout` JSON schema at build time.
2. `packages/ios`'s `KeyboardViewController` loads that schema and renders it
   with a small, native SwiftUI/UIKit interpreter (`SchemaRenderer`).
3. The interpreter maps schema nodes to native views; it must stay free of
   business logic (see AGENTS.md coding conventions).

## Consequences
- iOS and Android intentionally use different rendering strategies for the
  same JSX source (see ADR-002) — this is deliberate, not incidental
  divergence, and is the project's central architectural bet.
- The compiler's supported JSX/RN component-and-prop subset must be
  explicitly documented (`docs/api.md`) so library users know what will (and
  will not) render correctly on iOS.
- Any proposal to embed a live JS runtime in the iOS extension — even behind
  a flag — must be raised explicitly with the maintainer first; it is not a
  decision an agent should make unilaterally. See AGENTS.md Section 5.
