/**
 * @fluix-ui/vue — Vue 3 adapter for Fluix UI components.
 *
 * Exports:
 * - Toaster: component that renders all active toasts
 * - useFluixToasts: composable wrapper for core toast store
 * - fluix: re-exported imperative API from @fluix-ui/core
 */

export { fluix } from "@fluix-ui/core";
export { Toaster, useFluixToasts } from "./toast";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixTheme,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix-ui/core";
export type { ToasterProps } from "./toast";
