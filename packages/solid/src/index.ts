/**
 * @fluix-ui/solid — Solid.js adapter for Fluix UI components.
 *
 * Pattern:
 * - createSignal bridge from core store (fine-grained reactivity)
 * - Toaster component uses <For> over toasts
 * - onMount/onCleanup for lifecycle management
 */

export { fluix } from "@fluix-ui/core";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix-ui/core";

export { Notch } from "./notch";
export type { NotchConfig, NotchPosition, NotchTrigger, NotchTheme } from "@fluix-ui/core";

// TODO: Implement Toaster component + createFluixToasts signal
