# @fluix-ui/svelte

Svelte 5 adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/svelte @fluix-ui/css
```

## Usage

```ts
import { Toaster, fluix } from "@fluix-ui/svelte";
import "@fluix-ui/css";
```

### Custom themes

Pass any theme name — themes are pure CSS. See `@fluix-ui/css` for details.

```ts
fluix.success({ title: "Done", theme: "midnight" });
```

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
