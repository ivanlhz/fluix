# @fluix-ui/vanilla

Vanilla JS adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/vanilla @fluix-ui/css
```

## How imports work in Vanilla JS

### Option A: npm + bundler (Vite/Webpack/Rollup)

Use standard ESM imports in your source files:

```ts
import { createToaster, fluix } from "@fluix-ui/vanilla";
import "@fluix-ui/css";
```

### Option B: browser without bundler (CDN + global)

The IIFE build exposes a global `window.Fluix`.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fluix-ui/css/dist/fluix.css" />
<script src="https://cdn.jsdelivr.net/npm/@fluix-ui/vanilla/dist/index.global.js"></script>
<script>
  const { createToaster, fluix, createNotch, createMenu } = window.Fluix;
  createToaster({ position: "top-right" });
  fluix.success({ title: "Loaded" });
</script>
```

## Quick start (Toasts)

```ts
import { createToaster, fluix } from "@fluix-ui/vanilla";
import "@fluix-ui/css";

const toaster = createToaster({ position: "top-right", layout: "stack" });

document.querySelector("#save-btn")?.addEventListener("click", () => {
  fluix.success({
    title: "Saved",
    description: "Your changes were stored.",
  });
});
```

### Promise toasts

```ts
await fluix.promise(saveUser(), {
  loading: { title: "Saving..." },
  success: (data) => ({
    title: "Saved",
    description: `User ${data.name} updated`,
  }),
  error: (err) => ({
    title: "Failed",
    description: err instanceof Error ? err.message : "Unexpected error",
  }),
});
```

## Notch

```ts
import { createNotch } from "@fluix-ui/vanilla";

const container = document.querySelector("#notch-root");
if (!container) throw new Error("Missing #notch-root");

const notch = createNotch(container, {
  position: "top-center",
  trigger: "click",
  theme: "dark",
  pill: "Now",
  content: "Now playing: Fluix Theme",
});

notch.open();
```

## Menu

```ts
import { createMenu } from "@fluix-ui/vanilla";

const container = document.querySelector("#menu-root");
if (!container) throw new Error("Missing #menu-root");

const menu = createMenu(container, {
  activeId: "home",
  orientation: "horizontal",
  variant: "pill",
  theme: "dark",
  fill: "#6366f1", // custom indicator color
  items: [
    { id: "home", label: "Home" },
    { id: "projects", label: "Projects" },
    { id: "settings", label: "Settings" },
  ],
});
```

## Theming

Pass any theme name — themes are pure CSS. See `@fluix-ui/css` for details.

```ts
fluix.success({ title: "Done", theme: "midnight" });
```

## Exports

```ts
import { createToaster, createNotch, createMenu, fluix } from "@fluix-ui/vanilla";
import type {
  NotchOptions,
  MenuOptions,
  MenuInstance,
  MenuItemConfig,
  FluixToastOptions,
  FluixToasterConfig,
} from "@fluix-ui/vanilla";
```

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
