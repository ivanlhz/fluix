# @fluix-ui/react

React adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/react @fluix-ui/css
```

## Usage

```tsx
import { Toaster, fluix } from "@fluix-ui/react";
import "@fluix-ui/css";
```

### Custom themes

Pass any theme name — themes are pure CSS. See `@fluix-ui/css` for details.

```tsx
fluix.success({ title: "Done", theme: "midnight" });
```

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
