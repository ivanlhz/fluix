# Fluix

**Physics-based, cross-framework UI components. Beautiful by default.**

Fluix delivers opinionated UI components that work identically across React, Vue, Svelte, Solid, and Vanilla JS. Powered by spring physics, SVG gooey morphing, and zero animation dependencies.

## Packages

| Package | Description | Status |
|---|---|---|
| `@fluix-ui/core` | State machines, primitives, imperative APIs | ✅ Available |
| `@fluix-ui/css` | Shared styles (data-attribute selectors) | ✅ Available |
| `@fluix-ui/react` | React 18+ adapter | ✅ Available |
| `@fluix-ui/vue` | Vue 3+ adapter | ✅ Available |
| `@fluix-ui/svelte` | Svelte 5+ adapter | ✅ Available |
| `@fluix-ui/solid` | Solid.js adapter | ✅ Available |
| `@fluix-ui/vanilla` | Zero-framework adapter | ✅ Available |

## Components

| Component | Description | Status |
|---|---|---|
| Toast | Physics-based notifications with gooey SVG morphing | ✅ Available |
| Tooltip | Positioned floating content | 📋 Planned |
| Dialog | Modal with focus trap | 📋 Planned |
| Drawer | Draggable sheet with snap points | 📋 Planned |
| Command | Command palette with fuzzy search | 📋 Planned |
| Menu | Dropdown with keyboard navigation | 📋 Planned |
| Tabs | Accessible tabbed interface | 📋 Planned |

## Quick Start

```bash
# React
npm install @fluix-ui/react @fluix-ui/css

# Vue
npm install @fluix-ui/vue @fluix-ui/css

# Vanilla JS
npm install @fluix-ui/vanilla @fluix-ui/css
```

```tsx
// React example
import { Toaster, fluix } from "@fluix-ui/react";
import "@fluix-ui/css";

function App() {
  return (
    <>
      <Toaster config={{ position: "top-right" }} />
      <button onClick={() => fluix.success({ title: "Saved!" })}>
        Save
      </button>
    </>
  );
}
```

## Publish to npm

```bash
# 1) Authenticate
npm login
npm whoami

# 2) Build and verify
pnpm build
pnpm -r --filter "./packages/*" run typecheck
pnpm test
pnpm lint

# 3) Dry run publish
pnpm -r --filter "./packages/*" publish --dry-run --access public --no-git-checks

# 4) Publish
pnpm -r --filter "./packages/*" publish --access public
# if your git tree is intentionally dirty:
# pnpm -r --filter "./packages/*" publish --access public --no-git-checks
```

## Architecture

```
@fluix-ui/core    → Pure TypeScript logic (state machines, spring physics)
@fluix-ui/css     → Framework-agnostic styles (data-attribute selectors)
@fluix-ui/react   → Thin React adapter (~60 lines per component)
@fluix-ui/vue     → Thin Vue adapter
@fluix-ui/svelte  → Thin Svelte adapter
@fluix-ui/solid   → Thin Solid adapter
@fluix-ui/vanilla → Thin Vanilla JS adapter
```

See [AGENTS.md](./AGENTS.md) for the full architectural guide.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Open Source

- [Contributing Guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)

## Inspirations

- [Sileo](https://github.com/hiaaryan/sileo) — Original toast design and gooey SVG effect
- [Zag.js](https://zagjs.com) — Cross-framework state machine architecture
- [Sonner](https://sonner.emilkowal.ski) — Imperative toast API design

## License

MIT
