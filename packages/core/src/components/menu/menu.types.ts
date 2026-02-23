import type { SpringConfig } from "../../primitives/spring";

export type MenuOrientation = "vertical" | "horizontal";

export type MenuVariant = "pill" | "tab";

export type MenuTheme = "light" | "dark" | (string & {});

export interface MenuConfig {
	orientation?: MenuOrientation;
	variant?: MenuVariant;
	spring?: SpringConfig;
	roundness?: number;
	blur?: number;
	fill?: string;
	initialActiveId?: string | null;
}
