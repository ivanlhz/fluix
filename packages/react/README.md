# @fluix-ui/react

React adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/react @fluix-ui/css
```

## What this package includes

- `Toaster` + `fluix` imperative API for toast notifications.
- `Notch` for adaptive floating island interactions.
- `Menu` (`Menu.Root` + `Menu.Item`) for animated navigation.

## Quick start (Toasts)

```tsx
import { Toaster, fluix } from "@fluix-ui/react";
import "@fluix-ui/css";

export function App() {
  return (
    <>
      <Toaster config={{ position: "top-right", layout: "stack" }} />

      <button
        onClick={() =>
          fluix.success({
            title: "Saved",
            description: "Your changes were stored.",
          })
        }
      >
        Save
      </button>
    </>
  );
}
```

### Promise toasts

```tsx
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

`Notch` is a controlled/uncontrolled component with `pill` (collapsed content) and `content` (expanded content).

```tsx
import { Notch } from "@fluix-ui/react";

export function PlayerNotch() {
  return (
    <Notch
      position="top-center"
      trigger="click"
      theme="dark"
      pill={<span>Now</span>}
      content={
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button">Prev</button>
          <button type="button">Play</button>
          <button type="button">Next</button>
        </div>
      }
    />
  );
}
```

## Menu

Use `Menu.Root` in uncontrolled mode (`defaultActiveId`) or controlled mode (`activeId` + `onActiveChange`).

```tsx
import { Menu } from "@fluix-ui/react";

export function AppMenu() {
  return (
    <Menu.Root defaultActiveId="home" variant="pill" orientation="horizontal" theme="dark">
      <Menu.Item id="home">Home</Menu.Item>
      <Menu.Item id="projects">Projects</Menu.Item>
      <Menu.Item id="settings">Settings</Menu.Item>
    </Menu.Root>
  );
}
```

## Theming

Pass any theme name to Fluix components. Themes are pure CSS (see `@fluix-ui/css`).

```tsx
fluix.success({ title: "Done", theme: "midnight" });
```

## Exports

```ts
import { Toaster, fluix, Notch, Menu } from "@fluix-ui/react";
import type {
  ToasterProps,
  NotchProps,
  MenuRootProps,
  MenuItemProps,
  MenuOrientation,
  MenuVariant,
  MenuTheme,
  FluixToastOptions,
  FluixToasterConfig,
} from "@fluix-ui/react";
```

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
