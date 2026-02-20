/**
 * @fluix-ui/angular — Angular adapter for Fluix UI components.
 *
 * Exports:
 * - FluixToasterComponent: standalone component that renders all active toasts
 * - FluixToastService: injectable service with imperative API (success, error, dismiss, etc.)
 * - fluix: re-exported imperative API from @fluix-ui/core
 *
 * Usage:
 * 1. Import FluixToasterComponent in your app (e.g. AppComponent template: <fluix-toaster />)
 * 2. Import @fluix-ui/css styles (e.g. in angular.json or main styles)
 * 3. Inject FluixToastService and call this.fluixToast.success('Done!') etc.
 */

export { fluix } from "@fluix-ui/core";
export { FluixToastService } from "./fluix-toast.service";
export { FluixToasterComponent } from "./toaster.component";
export { FluixToastItemComponent } from "./toast-item.component";
export { FluixToastIconComponent } from "./toast-icon.component";
export { FluixAttrsDirective } from "./attrs.directive";
export { getToastState$ } from "./toast-state";

export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixTheme,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix-ui/core";
