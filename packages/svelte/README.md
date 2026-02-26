# @fluix-ui/svelte

Svelte 5 adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/svelte @fluix-ui/css
```

## What this package includes

- `Toaster` + `fluix` imperative API for toast notifications.
- `Notch` for adaptive floating island interactions.
- `Menu` + `MenuItem` for animated navigation.
- `createFluixToasts` for direct access to the toast machine store.

## Quick start (Toasts)

```svelte
<script lang="ts">
import { Toaster, fluix } from "@fluix-ui/svelte";
import "@fluix-ui/css";
</script>

<Toaster config={{ position: "top-right", layout: "stack" }} />

<button
  type="button"
  onclick={() =>
    fluix.success({
      title: "Saved",
      description: "Your changes were stored.",
    })}
>
  Save
</button>
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

`Notch` uses snippets for collapsed (`pill`) and expanded (`content`) UI.

```svelte
<script lang="ts">
  import { Notch } from "@fluix-ui/svelte";
</script>

<Notch position="top-center" trigger="click" theme="dark">
  {#snippet pill()}
    <span>Now</span>
  {/snippet}

  {#snippet content()}
    <div style="display:flex;gap:8px;">
      <button type="button">Prev</button>
      <button type="button">Play</button>
      <button type="button">Next</button>
    </div>
  {/snippet}
</Notch>
```

## Menu

Use `Menu` with `MenuItem` in uncontrolled mode (`defaultActiveId`) or controlled mode (`activeId` + `onActiveChange`).

```svelte
<script lang="ts">
  import { Menu, MenuItem } from "@fluix-ui/svelte";
</script>

<Menu defaultActiveId="home" variant="pill" orientation="horizontal" theme="dark">
  <MenuItem id="home">Home</MenuItem>
  <MenuItem id="projects">Projects</MenuItem>
  <MenuItem id="settings">Settings</MenuItem>
</Menu>
```

### Custom indicator fill

Override the indicator color with the `fill` prop:

```svelte
<Menu defaultActiveId="home" fill="#6366f1">
  <MenuItem id="home">Home</MenuItem>
</Menu>
```

## Theming

Pass any theme name — themes are pure CSS. See `@fluix-ui/css` for details.

```ts
fluix.success({ title: "Done", theme: "midnight" });
```

## Exports

```ts
import { Toaster, fluix, Notch, Menu, MenuItem, createFluixToasts } from "@fluix-ui/svelte";
import type {
  ToasterProps,
  NotchProps,
  MenuProps,
  MenuItemProps,
  MenuOrientation,
  MenuVariant,
  MenuTheme,
  FluixToastOptions,
  FluixToasterConfig,
} from "@fluix-ui/svelte";
```

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
