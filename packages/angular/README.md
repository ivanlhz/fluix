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

## Custom description (template, like React/Vue)

For rich content (e.g. promise success), pass a **template + context** instead of a string:

```ts
import { FluixToastService, type FluixDescriptionTemplate } from "@fluix-ui/angular";
import { TemplateRef, ViewChild } from "@angular/core";

@Component({ ... })
export class MyComponent {
  @ViewChild("myTemplate") myTemplate!: TemplateRef<MyData>;

  constructor(private fluix: FluixToastService) {}

  showWithTemplate() {
    this.fluix.success({
      title: "Done",
      description: {
        templateRef: this.myTemplate,
        context: { label: "Value" },
      } satisfies FluixDescriptionTemplate<MyData>,
    });
  }
}
```

```html
<ng-template #myTemplate let-data>
  <div class="my-content">{{ data.label }}</div>
</ng-template>
```

Use the same shape in `fluix.promise(..., { success: (data) => ({ description: { templateRef, context: data } }) })`.

## API

- **FluixToastService** (injectable): `success()`, `error()`, `warning()`, `info()`, `action()`, `promise()`, `dismiss(id)`, `clear(position?)`, `getMachine()`
- **FluixToasterComponent**: standalone component; place once in your app.
- **FluixDescriptionTemplate\<T\>**: `{ templateRef: TemplateRef<T>; context: T }` for custom description content.
- **fluix**: imperative API re-exported from `@fluix-ui/core` (use the service for Angular apps).

## Docs

- Official docs: https://fluix.ivanlopezdev.es
- Source code: https://github.com/ivanlhz/fluix
