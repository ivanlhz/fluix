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
// Notch
export { Notch } from "./notch";
// Menu
export { Menu, MenuItem } from "./menu";
