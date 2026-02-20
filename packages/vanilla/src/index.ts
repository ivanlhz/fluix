/**
 * @fluix-ui/vanilla — Vanilla JS adapter for Fluix UI components.
 *
 * Pattern:
 * - Subscribe to core store, diff previous/next toasts
 * - Create/remove DOM elements directly
 * - Apply attrs from getToastAttrs() as element.dataset mutations
 * - Use connectToast() for event wiring
 * - IIFE build exposes global `Fluix` object for CDN usage
 */

export { fluix } from "@fluix-ui/core";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix-ui/core";

export { createToaster } from "./toast";

export { createNotch } from "./notch";
export type { NotchOptions } from "./notch";
export type { NotchConfig, NotchPosition, NotchTrigger, NotchTheme } from "@fluix-ui/core";
