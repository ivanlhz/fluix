/**
 * @fluix-ui/svelte — Svelte 5 adapter for Fluix UI components.
 *
 * Exports:
 * - Toaster: component that renders all active toasts
 * - createFluixToasts: rune-based store wrapper for core toast store
 * - fluix: re-exported imperative API from @fluix-ui/core
 */

export { fluix } from "@fluix-ui/core";
export { Toaster, createFluixToasts } from "./toast";
export type { ToasterProps } from "./toast";
export type {
	FluixToastOptions,
	FluixToastPromiseOptions,
	FluixPosition,
	FluixTheme,
	FluixToastState,
	FluixToasterConfig,
} from "@fluix-ui/core";

// Notch
export { Notch } from "./notch";
export type { NotchProps } from "./notch";
export type { NotchConfig, NotchPosition, NotchTrigger, NotchTheme } from "@fluix-ui/core";

// Menu
export { Menu, MenuItem } from "./menu";
export type { MenuProps, MenuItemProps } from "./menu";
export type { MenuOrientation, MenuVariant, MenuTheme } from "@fluix-ui/core";

// Tooltip
export { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";
export type { TooltipProps, TooltipTriggerProps, TooltipContentProps } from "./tooltip";
export type { TooltipConfig, TooltipPosition, TooltipTheme } from "@fluix-ui/core";
