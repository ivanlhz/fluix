# @fluix-ui/vue

Vue 3 adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/vue @fluix-ui/css
```

## Usage

```ts
import { Toaster, fluix } from "@fluix-ui/vue";
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
