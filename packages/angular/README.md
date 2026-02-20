# @fluix-ui/angular

Angular adapter for Fluix UI components.

## Install

```bash
npm install @fluix-ui/angular @fluix-ui/core @fluix-ui/css
```

## Usage

1. **Import the Toaster** in your app (e.g. `AppComponent` or root layout):

```ts
import { FluixToasterComponent } from "@fluix-ui/angular";
import "@fluix-ui/css";

@Component({
  standalone: true,
  imports: [FluixToasterComponent],
  template: `<fluix-toaster />`,
  // ...
})
export class AppComponent {}
```

2. **Optional config** (position, layout, offset):

```html
<fluix-toaster [config]="{ position: 'bottom-right', layout: 'notch' }" />
```

3. **Show toasts** by injecting the service:

```ts
import { FluixToastService } from "@fluix-ui/angular";

@Component({ ... })
export class MyComponent {
  constructor(private fluix: FluixToastService) {}

  onSave() {
    this.fluix.success("Saved!");
    // or
    this.fluix.success({ title: "Done", description: "Your changes were saved." });
  }

  onError() {
    this.fluix.error("Something went wrong");
  }
}
```

## API

- **FluixToastService** (injectable): `success()`, `error()`, `warning()`, `info()`, `action()`, `promise()`, `dismiss(id)`, `clear(position?)`, `getMachine()`
- **FluixToasterComponent**: standalone component; place once in your app.
- **fluix**: imperative API re-exported from `@fluix-ui/core` (use the service for Angular apps).

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
