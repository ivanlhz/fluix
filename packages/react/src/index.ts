/**
 * @fluix/react — React adapter for Fluix UI components.
 *
 * Exports:
 * - Toaster: component that renders all active toasts
 * - fluix: re-exported imperative API from @fluix/core
 *
 * Pattern:
 * - useSyncExternalStore to subscribe to the core store
 * - getToastAttrs() to get data-attributes for each toast element
 * - SVG gooey filter rendered inline per toast
 * - Spring animations via WAAPI for SVG rects
 */

export { fluix } from "@fluix/core";
export { Toaster } from "./toast";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix/core";
export type { ToasterProps } from "./toast";
