import { type InjectionKey, inject } from "vue";
import type { getMenuAttrs, MenuVariant } from "@fluix-ui/core";

export interface MenuContextValue {
	activeId: () => string | null;
	setActive: (id: string) => void;
	attrs: () => ReturnType<typeof getMenuAttrs>;
	variant: () => MenuVariant;
	filterId: string;
	fill: () => string | undefined;
	blur: () => number;
	size: () => { width: number; height: number };
	registerIndicator: (node: SVGRectElement | SVGPathElement | null) => void;
	registerGhostIndicator: (node: SVGRectElement | null) => void;
	rootEl: () => HTMLElement | null;
}

export const MENU_CONTEXT_KEY: InjectionKey<MenuContextValue> = Symbol("fluix-menu");

export function useMenuContext(): MenuContextValue {
	const context = inject(MENU_CONTEXT_KEY);
	if (!context) {
		throw new Error("Menu components must be used inside <MenuRoot>.");
	}
	return context;
}
