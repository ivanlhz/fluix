/**
 * @fluix-ui/svelte — Svelte 5 adapter for Fluix UI components.
 *
 * Exports:
 * - Toaster: component that renders all active toasts
 * - createFluixToasts: rune-based store wrapper for core toast store
 * - fluix: re-exported imperative API from @fluix-ui/core
 */
export { fluix } from "@fluix-ui/core";
export { default as Toaster } from "./Toaster.svelte";
export { createFluixToasts } from "./toast.svelte.js";
// Notch
export { default as Notch } from "./Notch.svelte";
// Menu
export { default as Menu } from "./Menu.svelte";
export { default as MenuItem } from "./MenuItem.svelte";
