# AGENTS.md — Fluix Coding Agent Guide

Fluix is a cross-framework UI component library (`@fluix-ui/*`) with physics-based animations. Components share logic via `@fluix-ui/core`, styling via `@fluix-ui/css` (data-attribute selectors), and thin adapters for React, Vue, Svelte, Angular, and Vanilla JS.

## Commands

```bash
# Install
pnpm install

# Build (order matters: core → css → adapters)
pnpm build              # full build
pnpm build:core         # only @fluix-ui/core
pnpm build:css          # only @fluix-ui/css

# Test
pnpm test               # run all tests once (vitest run)
pnpm test:watch         # watch mode (vitest)
vitest run packages/core/src/primitives/store.test.ts      # single file
vitest run packages/core/src/components/toast              # single directory
vitest run -t "create adds toast"                          # single test by name

# Lint & Format (Biome)
pnpm lint               # biome check .
pnpm lint:fix           # biome check --write .
pnpm format             # biome format --write .

# Type check
pnpm typecheck          # runs tsc --noEmit in every package
pnpm --filter @fluix-ui/core run typecheck                 # single package

# Dev (watch mode for all packages)
pnpm dev

# Demo apps
pnpm demo               # React demo (builds first)
pnpm demo:vue           # Vue demo
pnpm demo:svelte        # Svelte demo
pnpm demo:vanilla       # Vanilla demo
pnpm demo:angular       # Angular demo
```

## Project Structure

```
packages/
  core/     @fluix-ui/core     Pure TS logic, zero DOM rendering
  css/      @fluix-ui/css      Data-attribute selectors, CSS custom properties
  react/    @fluix-ui/react    React 18+ adapter
  vue/      @fluix-ui/vue      Vue 3+ adapter
  svelte/   @fluix-ui/svelte   Svelte 5+ adapter (runes mode)
  angular/  @fluix-ui/angular  Angular adapter
  vanilla/  @fluix-ui/vanilla  No-framework adapter
apps/
  demo/          demo-vue/     demo-svelte/    demo-vanilla/    demo-angular/
```

### Component file structure (core)

```
packages/core/src/components/{name}/
  index.ts              barrel exports
  {name}.types.ts       public types
  {name}.machine.ts     state machine (pure logic, no DOM)
  {name}.attrs.ts       state → data-attribute mapping (pure function)
  {name}.connect.ts     DOM event wiring
  {name}.api.ts         imperative API (optional)
  {name}.machine.test.ts
  {name}.attrs.test.ts
```

## Code Style

### Formatting (enforced by Biome)

- **Indentation**: Tabs
- **Line width**: 100 characters
- **Quotes**: Double quotes (`"`)
- **Semicolons**: Always
- **Trailing commas**: Always (all positions)

### Imports

Biome organizes imports automatically. Order: external → internal packages → relative.
Use inline `type` keyword for type-only imports:

```ts
import { type Store, createStore } from "../../primitives/store";
import type { MenuVariant } from "./menu.types";
```

### Naming

| What | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `toast.machine.ts` |
| Test files | colocated `*.test.ts` | `store.test.ts` |
| Constants | `UPPER_SNAKE_CASE` | `FLUIX_SPRING`, `TOAST_DEFAULTS` |
| Functions | `camelCase` | `createStore`, `getToastAttrs` |
| Types/Interfaces | `PascalCase` | `Store<T>`, `SpringConfig` |
| Public types | `Fluix`-prefixed | `FluixPosition`, `FluixToastItem` |
| CSS custom props | `--fluix-{component}-{prop}` | `--fluix-menu-indicator` |
| Data attributes | `data-fluix-{element}` | `data-fluix-toast` |
| npm scope | `@fluix-ui` | `@fluix-ui/core` |

### Exports

- **Named exports only.** No default exports anywhere.
- Type re-exports use `export type { ... }`.
- Each directory has an `index.ts` with explicit named re-exports (no `export *`).

### Types

- Derive unions from const arrays: `(typeof POSITIONS)[number]`
- Branded string pattern for extensible unions: `"light" | "dark" | (string & {})`
- Separate `*.types.ts` file per component for public types.

### Error Handling

- Rely on TypeScript strict mode, not runtime checks.
- `try/catch` only at API boundaries (e.g., WAAPI fallback).
- Return `null` for operations that can't be performed.
- Guard with existence checks: `if (!item || item.exiting) return prev;`

## Architecture Rules

1. **All logic in `@fluix-ui/core`.** Adapters only bridge lifecycle/reactivity. If an adapter exceeds ~80 lines, logic is leaking.
2. **DOM contract = data-attributes.** CSS selects `[data-fluix-*]`. Never class names for state.
3. **Zero animation deps.** CSS `linear()` spring easing, Web Animations API, or `requestAnimationFrame`. No external animation libraries.
4. **Adapters produce DOM with attrs from `component.attrs.ts`**, subscribe to the core store, and connect/disconnect events. They do NOT contain business logic, calculate positions, define styles, or manage timers.

## Testing

- **Environment**: `node` by default. Add `/** @vitest-environment jsdom */` at file top for DOM tests.
- **Imports**: Always `import { describe, expect, it, vi } from "vitest"` explicitly.
- **Timers**: Use `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`.
- **Cleanup**: Always call `machine.destroy()` in tests.
- **DOM mocks**: Provide `ResizeObserver` mock in `beforeAll` for jsdom tests.
- **Test names**: Plain descriptive English. Example: `"create adds toast and returns id"`.

## CSS Rules

- ALL selectors use `[data-fluix-*]` attribute selectors. Never framework-specific class names.
- Colors in `oklch()`.
- Support `prefers-reduced-motion: reduce`.
- Each component gets its own CSS file in `packages/css/src/`.

## Commit Style

Concise imperative messages, no conventional commit prefixes needed:

```
fix toast auto-dismiss hover race
refactor react toast viewport offset helper
add menu keyboard navigation
```

## Key Config

- **TypeScript**: `ES2022`, strict, `bundler` module resolution
- **Build**: tsup → ESM + CJS + DTS (vanilla also builds IIFE)
- **Monorepo**: pnpm workspaces (`packages/*`, `apps/*`)
- **All packages**: `"type": "module"`, version `0.0.9`
