/**
 * @fluix/solid — Solid.js adapter for Fluix UI components.
 *
 * Pattern:
 * - createSignal bridge from core store (fine-grained reactivity)
 * - Toaster component uses <For> over toasts
 * - onMount/onCleanup for lifecycle management
 */

export { fluix } from "@fluix/core";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix/core";

// TODO: Implement Toaster component + createFluixToasts signal
