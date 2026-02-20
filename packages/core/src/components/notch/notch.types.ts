/**
 * Public types for the Notch component.
 *
 * A headless expanding pill with gooey SVG morphing.
 * Content is flexible — the user decides what goes inside.
 */

import type { SpringConfig } from "../../primitives/spring";

export type NotchPosition = "top-center" | "top-left" | "top-right" | "bottom-center";

export type NotchTrigger = "hover" | "click" | "manual";

export type NotchTheme = "light" | "dark" | (string & {});

export interface NotchConfig {
	/** Fixed position on screen. Default: "top-center" */
	position?: NotchPosition;
	/** How the notch opens. Default: "click" */
	trigger?: NotchTrigger;
	/** Spring physics config. Default: FLUIX_SPRING */
	spring?: SpringConfig;
	/** Border radius of the pill. Default: 20 */
	roundness?: number;
	/** Gooey filter blur intensity. Derived from roundness if omitted. */
	blur?: number;
	/** Background fill color. Default: uses CSS variable. */
	fill?: string;
}

export interface NotchSize {
	w: number;
	h: number;
}
