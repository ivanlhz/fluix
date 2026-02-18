/**
 * @fluix/vanilla — Vanilla JS adapter for Fluix UI components.
 *
 * Pattern:
 * - Subscribe to core store, diff previous/next toasts
 * - Create/remove DOM elements directly
 * - Apply attrs from getToastAttrs() as element.dataset mutations
 * - Use connectToast() for event wiring
 * - IIFE build exposes global `Fluix` object for CDN usage
 */

export { fluix } from "@fluix/core";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix/core";

// TODO: Implement createToaster() function
// export { createToaster } from "./toast";
