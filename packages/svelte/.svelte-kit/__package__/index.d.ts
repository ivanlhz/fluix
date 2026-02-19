/**
 * @fluix/svelte — Svelte 5 adapter for Fluix UI components.
 *
 * Exports:
 * - Toaster: component that renders all active toasts
 * - createFluixToasts: rune-based store wrapper for core toast store
 * - fluix: re-exported imperative API from @fluix/core
 */
export { fluix } from "@fluix/core";
export { default as Toaster } from "./Toaster.svelte";
export { createFluixToasts } from "./toast.svelte.js";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixTheme,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix/core";
export type { ToasterProps } from "./Toaster.svelte";
//# sourceMappingURL=index.d.ts.map
