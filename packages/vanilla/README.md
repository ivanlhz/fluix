# @fluix-ui/vanilla

Vanilla JS adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/vanilla @fluix-ui/css
```

## Usage

```ts
import { createToaster, fluix } from "@fluix-ui/vanilla";
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
