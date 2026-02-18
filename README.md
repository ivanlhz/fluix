# Fluix

**Physics-based, cross-framework UI components. Beautiful by default.**

Fluix delivers opinionated UI components that work identically across React, Vue, Svelte, Solid, and Vanilla JS. Powered by spring physics, SVG gooey morphing, and zero animation dependencies.

## Packages

| Package | Description | Status |
|---|---|---|
| `@fluix/core` | State machines, primitives, imperative APIs | 🚧 WIP |
| `@fluix/css` | Shared styles (data-attribute selectors) | 🚧 WIP |
| `@fluix/react` | React 18+ adapter | 📋 Planned |
| `@fluix/vue` | Vue 3+ adapter | 📋 Planned |
| `@fluix/svelte` | Svelte 5+ adapter | 📋 Planned |
| `@fluix/solid` | Solid.js adapter | 📋 Planned |
| `@fluix/vanilla` | Zero-framework adapter | 📋 Planned |

## Components

| Component | Description | Status |
|---|---|---|
| Toast | Physics-based notifications with gooey SVG morphing | 🚧 WIP |
| Tooltip | Positioned floating content | 📋 Planned |
| Dialog | Modal with focus trap | 📋 Planned |
| Drawer | Draggable sheet with snap points | 📋 Planned |
| Command | Command palette with fuzzy search | 📋 Planned |
| Menu | Dropdown with keyboard navigation | 📋 Planned |
| Tabs | Accessible tabbed interface | 📋 Planned |

## Quick Start

```bash
# React
npm install @fluix/react @fluix/css

# Vue
npm install @fluix/vue @fluix/css

# Vanilla JS
npm install @fluix/vanilla @fluix/css
```

```tsx
// React example
import { Toaster, fluix } from "@fluix/react";
import "@fluix/css";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <button onClick={() => fluix.success({ title: "Saved!" })}>
        Save
      </button>
    </>
  );
}
```

## Architecture

```
@fluix/core    → Pure TypeScript logic (state machines, spring physics)
@fluix/css     → Framework-agnostic styles (data-attribute selectors)
@fluix/react   → Thin React adapter (~60 lines per component)
@fluix/vue     → Thin Vue adapter
@fluix/svelte  → Thin Svelte adapter
@fluix/solid   → Thin Solid adapter
@fluix/vanilla → Thin Vanilla JS adapter
```

See [AGENTS.md](./AGENTS.md) for the full architectural guide.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Inspirations

- [Sileo](https://github.com/hiaaryan/sileo) — Original toast design and gooey SVG effect
- [Zag.js](https://zagjs.com) — Cross-framework state machine architecture
- [Sonner](https://sonner.emilkowal.ski) — Imperative toast API design

## License

MIT
