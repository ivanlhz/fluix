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
export {
	FluixToastService,
	FluixToasterComponent,
	FluixToastItemComponent,
	FluixToastIconComponent,
	getToastState$,
} from "./toast";
export { FluixAttrsDirective } from "./attrs.directive";

export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixTheme,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix-ui/core";

export type { FluixDescriptionTemplate } from "./toast";
export { isDescriptionTemplate } from "./toast";

export { FluixNotchComponent } from "./notch";
export type { NotchConfig, NotchPosition, NotchTrigger, NotchTheme } from "@fluix-ui/core";

export { FluixMenuComponent, FluixMenuItemComponent } from "./menu";
export type { MenuOrientation, MenuVariant, MenuTheme } from "@fluix-ui/core";

export { FluixTooltipComponent } from "./tooltip";
export type { TooltipConfig, TooltipPosition, TooltipTheme } from "@fluix-ui/core";
