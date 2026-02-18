/**
 * @fluix/svelte — Svelte 5 adapter for Fluix UI components.
 *
 * Pattern:
 * - Wrap core store as Svelte readable store using $effect
 * - Toaster component uses {#each} over toasts
 * - Svelte actions for DOM event wiring (use:connectToast)
 */

export { fluix } from "@fluix/core";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix/core";

// TODO: Implement Toaster component + createFluixToasts store
