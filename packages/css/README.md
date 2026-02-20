# @fluix-ui/css

Shared CSS for Fluix UI components.

Uses the Fluix data-attribute contract (`data-fluix-*`) and provides animations, variables, and toast styles.

## Install

```bash
npm install @fluix-ui/css
```

## Usage

```ts
// Full bundle (includes light + dark themes)
import "@fluix-ui/css";
```

### Individual imports

```ts
import "@fluix-ui/css/variables";
import "@fluix-ui/css/animations";
import "@fluix-ui/css/toast";
import "@fluix-ui/css/themes/dark"; // dark theme only
```

## Theming

Fluix ships with `light` (default) and `dark` themes. You can also create custom themes — it's just CSS.

### Built-in themes

The `light` theme variables are defined on `[data-fluix-toast]` as defaults. The `dark` theme is in `themes/dark.css` and is included in the main bundle.

### Creating a custom theme

Define CSS custom properties scoped to your theme name via `[data-theme="<name>"]`:

```css
/* midnight-theme.css */
[data-fluix-toast][data-theme="midnight"] {
  --fluix-text: oklch(0.90 0.02 260);
  --fluix-text-muted: oklch(0.65 0.02 260);
  --fluix-surface-contrast: #0a0e1a;
}
```

Then import it and use the theme name:

```ts
import "./midnight-theme.css";

fluix.success({ title: "Saved!", theme: "midnight" });
```

### CSS variables reference

| Variable | Description | Light default | Dark default |
|---|---|---|---|
| `--fluix-text` | Primary text color | `oklch(0.26 0 0)` | `oklch(0.93 0 0)` |
| `--fluix-text-muted` | Secondary/description text | `oklch(0.54 0 0)` | `oklch(0.74 0 0)` |
| `--fluix-surface-contrast` | Toast background (SVG fill) | `#ffffff` | `#141416` |

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
