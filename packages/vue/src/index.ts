/**
 * @fluix/vue — Vue 3 adapter for Fluix UI components.
 *
 * Pattern:
 * - Composable (useFluixToasts) wraps store.subscribe with Vue reactivity
 * - Toaster component uses v-for over toasts, applies attrs from getToastAttrs()
 * - watchEffect for auto-cleanup on unmount
 */

export { fluix } from "@fluix/core";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix/core";

// TODO: Implement Toaster component + useFluixToasts composable
