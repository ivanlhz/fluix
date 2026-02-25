# @fluix-ui/vue

Vue 3 adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/vue @fluix-ui/css
```

## What this package includes

- `Toaster` + `fluix` imperative API for toast notifications.
- `Notch` for adaptive floating island interactions.
- `MenuRoot` + `MenuItem` for animated navigation.
- `useFluixToasts` for direct access to the toast machine store.

## Quick start (Toasts)

```vue
<script setup lang="ts">
import { Toaster, fluix } from "@fluix-ui/vue";
import "@fluix-ui/css";
</script>

<template>
  <Toaster :config="{ position: 'top-right', layout: 'stack' }" />

  <button
    type="button"
    @click="
      fluix.success({
        title: 'Saved',
        description: 'Your changes were stored.',
      })
    "
  >
    Save
  </button>
</template>
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

`Notch` uses slots: default slot for collapsed pill content and `content` slot for expanded content.

```vue
<script setup lang="ts">
import { Notch } from "@fluix-ui/vue";
</script>

<template>
  <Notch position="top-center" trigger="click" theme="dark">
    <template #pill>
      <span>Now</span>
    </template>

    <template #content>
      <div style="display:flex;gap:8px;">
        <button type="button">Prev</button>
        <button type="button">Play</button>
        <button type="button">Next</button>
      </div>
    </template>
  </Notch>
</template>
```

## Menu

Use `MenuRoot` in uncontrolled mode (`defaultActiveId`) or controlled mode (`activeId` + `onActiveChange`).

```vue
<script setup lang="ts">
import { MenuRoot, MenuItem } from "@fluix-ui/vue";
</script>

<template>
  <MenuRoot defaultActiveId="home" variant="pill" orientation="horizontal" theme="dark">
    <MenuItem id="home">Home</MenuItem>
    <MenuItem id="projects">Projects</MenuItem>
    <MenuItem id="settings">Settings</MenuItem>
  </MenuRoot>
</template>
```

## Theming

Pass any theme name — themes are pure CSS. See `@fluix-ui/css` for details.

```ts
fluix.success({ title: "Done", theme: "midnight" });
```

## Exports

```ts
import { Toaster, fluix, Notch, MenuRoot, MenuItem, useFluixToasts } from "@fluix-ui/vue";
import type {
  ToasterProps,
  MenuOrientation,
  MenuVariant,
  MenuTheme,
  NotchPosition,
  NotchTrigger,
  NotchTheme,
  FluixToastOptions,
  FluixToasterConfig,
} from "@fluix-ui/vue";
```

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
