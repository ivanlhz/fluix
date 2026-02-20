# NotchMenu Component Design

## Overview

A headless, multi-framework component that renders a fixed "pill" (Dynamic Island style) that expands/contracts fluidly with a gooey SVG effect. Content is 100% flexible via slots. The SVG shape continuously adapts to internal content size using spring physics.

## States

No discrete states. The notch has a **base size** (collapsed pill) and morphs fluidly toward the size of whatever content is passed. The user controls what content is visible at any moment.

## Interaction

- **Hover**: expands on mouseenter, contracts on mouseleave
- **Click/tap**: toggles open/close
- **Programmatic**: `open()`, `close()`, `toggle()` API
- `trigger` prop controls which mode is active

## Architecture

### Core (`packages/core/src/components/notch/`)

| File | Purpose |
|------|---------|
| `notch.types.ts` | Type definitions |
| `notch.machine.ts` | State machine with reactive store |
| `notch.connect.ts` | DOM event wiring (hover, click, resize) |
| `notch.attrs.ts` | `data-fluix-notch-*` attribute generation |

### State Machine

```ts
interface NotchMachineState {
  open: boolean
  contentSize: { w: number; h: number }
  baseSize: { w: number; h: number }
}
```

Simple store — adapter measures content via ResizeObserver, passes dimensions to core, core manages open/close state, adapter animates SVG rect with `animateSpring()`.

### SVG Structure

Single `<rect>` with `rx/ry` for rounded corners, wrapped in gooey SVG filter:

```svg
<svg data-fluix-notch-canvas>
  <defs>
    <filter id="notch-goo">
      <feGaussianBlur stdDeviation="6" />
      <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" />
    </filter>
  </defs>
  <g filter="url(#notch-goo)">
    <rect rx="20" />
  </g>
</svg>
```

The rect animates via `animateSpring()` — width and height change with spring physics toward measured content size. The gooey filter creates the liquid effect on edges during deformation.

## Data Attributes

| Attribute | Element |
|-----------|---------|
| `[data-fluix-notch]` | Root container (fixed positioning) |
| `[data-fluix-notch-canvas]` | SVG canvas with gooey filter |
| `[data-fluix-notch-pill]` | Collapsed pill content (always visible) |
| `[data-fluix-notch-content]` | Expanded content (user slot) |
| `[data-open]` | Open state on root (`"true"` / `"false"`) |

## CSS Custom Properties

| Property | Default | Purpose |
|----------|---------|---------|
| `--fluix-notch-bg` | `oklch(0.15 0 0)` | Background color |
| `--fluix-notch-radius` | `20` | Border radius |
| `--fluix-notch-padding` | `8px` | Internal padding |

## API

### Core

```ts
import { createNotch } from '@fluix-ui/core'

const notch = createNotch({
  position: 'top-center',
  spring: { stiffness: 170, damping: 18 },
})

notch.open()
notch.close()
notch.toggle()
notch.resize()  // force re-measure
notch.destroy()
```

### React

```tsx
<Notch trigger="hover">
  <Notch.Pill>
    <Logo />
  </Notch.Pill>
  <Notch.Content>
    <nav>...</nav>
  </Notch.Content>
</Notch>
```

### Svelte

```svelte
<Notch trigger="hover">
  {#snippet pill()}
    <Logo />
  {/snippet}
  {#snippet content()}
    <nav>...</nav>
  {/snippet}
</Notch>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trigger` | `'hover' \| 'click' \| 'manual'` | `'click'` | Activation mode |
| `position` | `'top-center' \| 'top-left' \| 'top-right' \| 'bottom-center'` | `'top-center'` | Fixed position |
| `spring` | `SpringConfig` | `FLUIX_SPRING` | Spring physics config |
| `open` | `boolean` | `undefined` | Controlled mode |
| `onOpenChange` | `(open: boolean) => void` | `undefined` | State change callback |

## Implementation Order

1. Core types + machine
2. Core connect + attrs
3. CSS styles
4. Svelte adapter (primary demo)
5. React adapter
6. Other adapters as needed
