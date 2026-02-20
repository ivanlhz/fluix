# @fluix-ui/core

Core logic for Fluix UI components.

This package contains framework-agnostic primitives, state machines, and the imperative `fluix` API used by all adapters.

## Install

```bash
npm install @fluix-ui/core
```

## Highlights

- Toast state machine and API
- Shared primitives (store, spring, dismiss)
- Type-safe exports for adapters and consumers
- **Theme plugin system** — `"light"`, `"dark"`, or any custom string

## Theming

The `theme` option accepts any string, not just `"light"` or `"dark"`. Built-in themes (`light`, `dark`) work out of the box. Custom themes are pure CSS — no JS configuration needed.

```ts
fluix.success({ title: "Saved!", theme: "midnight" });
```

The SVG background color is derived from the CSS variable `--fluix-surface-contrast`, so custom themes control it entirely through CSS. You can still override it per-toast with the `fill` option.

See `@fluix-ui/css` for how to create custom themes.

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
