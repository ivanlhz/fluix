# AGENTS.md — Fluix Project Guide

## What is Fluix?

Fluix is a cross-framework UI component library with physics-based animations and opinionated visual design. Components work identically across React, Vue, Svelte, Solid, and Vanilla JS.

The name comes from "fluid" + "UI" + "x" (cross-framework).

## Core Philosophy

1. **Logic lives in `@fluix/core` and ONLY there.** No component logic in adapters. Ever.
2. **The DOM contract is data-attributes.** CSS selectors target `[data-fluix-*]` attributes. Any framework that produces the right DOM gets styling for free.
3. **Adapters are thin.** If an adapter file exceeds ~80 lines, logic is leaking out of core.
4. **Zero animation dependencies.** CSS `linear()` spring easing for transitions, Web Animations API for programmatic animation. No Framer Motion, no GSAP, no anime.js.
5. **Opinionated visual, flexible behavior.** Components look beautiful by default. Behavior (timing, positioning, keyboard) is configurable. Visual style is overridable via CSS custom properties and class overrides.

## Architecture

```
┌─────────────────────────────────────────────┐
│           Framework Adapters                │
│  @fluix/react  @fluix/vue  @fluix/svelte    │
│  @fluix/solid  @fluix/vanilla               │
│  Role: mount, lifecycle, reactivity bridge  │
├─────────────────────────────────────────────┤
│       @fluix/core — Component Logic         │
│  toast/  dialog/  tooltip/  menu/  ...      │
│  State machines + imperative APIs           │
├─────────────────────────────────────────────┤
│       @fluix/core — Shared Primitives       │
│  store  spring  position  focus-trap        │
│  keyboard-nav  dismiss  dom-utils           │
├─────────────────────────────────────────────┤
│              @fluix/css                      │
│  Data-attribute selectors, animations       │
│  CSS custom properties for theming          │
└─────────────────────────────────────────────┘
```

## Package Structure

```
packages/
  core/           → @fluix/core        — Pure TS, zero DOM rendering
    src/
      primitives/                      — Reusable utilities
        store.ts                       — Observable store (pub/sub)
        spring.ts                      — Spring physics solver
        position.ts                    — Floating element positioning
        focus-trap.ts                  — Focus trapping for modals
        keyboard.ts                    — Keyboard navigation engine
        dismiss.ts                     — Escape / click-outside / scroll detection
      components/
        toast/
          toast.machine.ts             — State + transitions + timers
          toast.api.ts                 — Imperative API (fluix.success, etc.)
          toast.attrs.ts               — DOM attribute contract
          toast.connect.ts             — DOM event wiring
          toast.types.ts               — Public types
          toast.test.ts                — Unit tests
        [future: dialog/, tooltip/, menu/, drawer/, tabs/, ...]
      index.ts                         — Public exports
  css/            → @fluix/css         — Shared styles
    src/
      toast.css
      variables.css                    — CSS custom properties
      animations.css                   — Spring easing, keyframes
      [future: dialog.css, tooltip.css, ...]
  react/          → @fluix/react       — React 18+ adapter
  vue/            → @fluix/vue         — Vue 3+ adapter
  svelte/         → @fluix/svelte      — Svelte 5+ adapter
  solid/          → @fluix/solid       — Solid 1.x adapter
  vanilla/        → @fluix/vanilla     — No framework adapter
```

## The DOM Contract

This is the most important concept in Fluix. The contract between core logic and CSS is a set of data-attributes. If the DOM has the right attributes, the component looks and animates correctly regardless of which framework rendered it.

### Rules

- All Fluix attributes are prefixed with `data-fluix-`.
- State is expressed as attribute values: `data-state="success"`, `data-expanded="true"`.
- CSS selectors ONLY use data-attribute selectors. Never class names for logic-driven styles.
- Custom classes from users go in a `styles` option and are ADDITIVE (they don't replace data-attr styles).

### Example: Toast DOM Contract

```html
<!-- Viewport container -->
<section data-fluix-viewport data-position="top-right" aria-live="polite">

  <!-- Individual toast -->
  <button data-fluix-toast data-state="success" data-ready="true"
          data-expanded="false" data-exiting="false" data-edge="bottom">

    <!-- SVG canvas with gooey filter -->
    <div data-fluix-canvas data-edge="bottom">
      <svg data-fluix-svg>
        <rect data-fluix-pill />
        <rect data-fluix-body />
      </svg>
    </div>

    <!-- Header (icon + title) -->
    <div data-fluix-header data-edge="bottom">
      <div data-fluix-badge data-state="success"><!-- icon --></div>
      <span data-fluix-title data-state="success">Success</span>
    </div>

    <!-- Expandable content -->
    <div data-fluix-content data-edge="bottom" data-visible="false">
      <div data-fluix-description>...</div>
    </div>
  </button>
</section>
```

## Primitives API

### Store (`primitives/store.ts`)

Minimal observable state container. This is how core communicates with adapters.

```ts
interface Store<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
  update(fn: (prev: T) => T): void;
  // For React's useSyncExternalStore compatibility
  getServerSnapshot?(): T;
}

function createStore<T>(initialState: T): Store<T>;
```

Framework consumption:
- **React**: `useSyncExternalStore(store.subscribe, store.getSnapshot)`
- **Vue**: `watchEffect` + `store.subscribe`
- **Svelte**: Wrap as Svelte readable store
- **Solid**: `createStore` bridge with `createEffect`
- **Vanilla**: `store.subscribe(renderFn)`

### Spring (`primitives/spring.ts`)

Attempt 1: CSS `linear()` easing (zero JS, runs on compositor thread).
Fallback: Web Animations API with pre-computed spring keyframes.
Last resort: `requestAnimationFrame` loop.

```ts
interface SpringConfig {
  stiffness?: number;  // default: 100
  damping?: number;    // default: 10
  mass?: number;       // default: 1
  bounce?: number;     // shorthand: 0 = critically damped, 1 = very bouncy
}

// Generate CSS linear() easing string from spring params
function springToLinearEasing(config: SpringConfig): string;

// Pre-compute keyframes for WAAPI
function springKeyframes(from: number, to: number, config: SpringConfig): Keyframe[];

// Animate an element property with spring physics
function animateSpring(
  el: Element,
  properties: Record<string, [from: number, to: number]>,
  config?: SpringConfig
): Animation;
```

### Dismiss (`primitives/dismiss.ts`)

```ts
interface DismissOptions {
  escape?: boolean;
  clickOutside?: boolean | { ignore?: (Element | string)[] };
  scrollOutside?: boolean;
}

function createDismiss(
  container: () => Element | null,
  onDismiss: () => void,
  options: DismissOptions
): { destroy(): void };
```

## Component Design Pattern

Every component in `core/src/components/` follows this structure:

### 1. Types (`component.types.ts`)

Public types exported to consumers.

### 2. Machine (`component.machine.ts`)

Pure state + transitions. No DOM, no side effects.

```ts
// Pattern for every component machine:
interface ComponentState { /* ... */ }
interface ComponentContext { /* config, items, etc. */ }

function createComponentMachine(config: ComponentConfig): {
  store: Store<ComponentState>;
  send(action: Action): void;
  destroy(): void;
}
```

### 3. Attrs (`component.attrs.ts`)

Maps state to data-attributes. Pure function, no side effects.

```ts
function getToastAttrs(state: ToastState, item: ToastItem): {
  root: Record<string, string>;
  header: Record<string, string>;
  badge: Record<string, string>;
  // ...
};
```

### 4. Connect (`component.connect.ts`)

Wires DOM events to the machine. Used by vanilla adapter and as reference for framework adapters.

```ts
function connectToast(
  element: HTMLElement,
  machine: ToastMachine,
  item: ToastItem
): { destroy(): void };
```

### 5. API (`component.api.ts`)

Imperative API for components that support it (toast, dialog).

```ts
// Toast-specific imperative API
const fluix = {
  success(opts: ToastOptions): string;
  error(opts: ToastOptions): string;
  warning(opts: ToastOptions): string;
  info(opts: ToastOptions): string;
  action(opts: ToastOptions): string;
  promise<T>(promise: Promise<T>, opts: PromiseOptions<T>): Promise<T>;
  dismiss(id: string): void;
  clear(position?: Position): void;
};
```

## Adapter Pattern

Each framework adapter follows the same contract:

### What an adapter DOES:
1. Subscribe to the core store and trigger re-renders
2. Produce DOM elements with the attrs from `component.attrs.ts`
3. Connect/disconnect event listeners on mount/unmount
4. Provide the SVG elements for the gooey effect
5. Expose framework-idiomatic API (hooks for React, composables for Vue, etc.)

### What an adapter DOES NOT:
1. Contain any business logic (state transitions, timing, etc.)
2. Calculate positions, measurements, or derived state
3. Define CSS styles or animations
4. Manage timers or async operations

### React adapter example structure:

```tsx
// packages/react/src/toast.tsx
import { toastMachine, getToastAttrs, fluix } from "@fluix/core";
import { useSyncExternalStore } from "react";

export function Toaster(props: ToasterProps) {
  const toasts = useSyncExternalStore(
    toastMachine.store.subscribe,
    toastMachine.store.getSnapshot
  );
  // Render toasts using getToastAttrs() for each item
  // Wire events from core's connect or inline
}

export { fluix } from "@fluix/core";
```

## CSS Architecture

### File organization
- `variables.css` — CSS custom properties (colors, spacing, timing)
- `animations.css` — `@keyframes`, `linear()` spring easing
- `toast.css` — Toast-specific styles using `[data-fluix-*]` selectors
- Each future component gets its own CSS file

### Theming via CSS custom properties
```css
:root {
  --fluix-state-success: oklch(0.723 0.219 142.136);
  --fluix-state-error: oklch(0.637 0.237 25.331);
  --fluix-duration: 600ms;
  --fluix-spring-easing: linear(0, 0.002 0.6%, ...);
  /* etc. */
}
```

### Rules
- NEVER use framework-specific class naming (no `.react-toast`, no scoped styles)
- ALL selectors use `[data-fluix-*]` attribute selectors
- Users can override via custom properties or by adding classes through `styles` option
- Support `prefers-reduced-motion: reduce`
- Use `oklch()` for color definitions (modern, perceptually uniform)

## SVG Gooey Effect

The signature visual effect uses an SVG filter:

```xml
<filter id="fluix-gooey">
  <feGaussianBlur in="SourceGraphic" stdDeviation="{blur}" result="blur" />
  <feColorMatrix in="blur" mode="matrix"
    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
    result="goo" />
  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
</filter>
```

Two SVG `<rect>` elements (pill + body) are animated. When they overlap through the gooey filter, they merge visually. The animation of rect dimensions is done via WAAPI (not CSS transitions, because SVG attribute animation support varies).

The filter ID must be unique per toast instance to avoid conflicts: `fluix-gooey-{toastId}`.

## Animation Strategy

| What | Method | Why |
|---|---|---|
| Toast enter/exit | CSS transitions + `linear()` | Compositor thread, no JS needed |
| Toast height change | CSS `transition: height` | Smooth expand/collapse |
| Header crossfade | CSS `@keyframes` | Blur + opacity animation |
| SVG pill resize | Web Animations API | SVG attrs need programmatic animation |
| SVG body expand | Web Animations API | Same as above |
| Content opacity | CSS transition | Simple fade |
| Swipe gesture | Direct `style.transform` | Immediate response to pointer |

## Testing Strategy

- **Primitives**: Pure unit tests (store, spring math, keyboard logic)
- **Machines**: State transition tests (given state X, when action Y, expect state Z)
- **Attrs**: Snapshot tests (given state, expect these attributes)
- **Adapters**: Integration tests with framework test utils (React Testing Library, Vue Test Utils, etc.)
- **CSS**: Visual regression tests (optional, with Playwright)

## Naming Conventions

- Files: `kebab-case.ts`
- Types/Interfaces: `PascalCase` prefixed with `Fluix` for public types
- CSS custom properties: `--fluix-{component}-{property}`
- Data attributes: `data-fluix-{element}`
- Store/machine functions: `create{Component}Machine`
- Attr functions: `get{Component}Attrs`
- API objects: named export matching component (e.g., `fluix` for toast)

## Adding a New Component

1. Create `packages/core/src/components/{name}/` with: types, machine, attrs, connect, api (if imperative), tests
2. Create `packages/css/src/{name}.css` with data-attribute selectors
3. Add adapter in each `packages/{framework}/src/{name}.{ext}`
4. Export from each package's `index.ts`
5. Write tests at each layer

## Build & Tooling

- **Monorepo**: pnpm workspaces
- **Build**: tsup (esbuild-based, outputs ESM + CJS + DTS)
- **Test**: vitest
- **Lint/Format**: Biome
- **CI**: GitHub Actions

## Current Status

- [x] Project scaffolding
- [ ] Core primitives: store
- [ ] Core primitives: spring
- [ ] Toast machine
- [ ] Toast CSS
- [ ] React adapter: toast
- [ ] Vue adapter: toast
- [ ] Svelte adapter: toast
- [ ] Solid adapter: toast
- [ ] Vanilla adapter: toast
- [ ] Documentation site

## Inspirations & References

- **Sileo** (hiaaryan/sileo) — Original toast design, gooey SVG effect, spring physics
- **Zag.js** — State machine pattern for cross-framework components
- **Ark UI** — Zag.js-based component library (adapter pattern reference)
- **TanStack** — Cross-framework library architecture
- **Sonner** — Imperative toast API design
- **Radix UI** — Accessibility patterns and ARIA implementation
