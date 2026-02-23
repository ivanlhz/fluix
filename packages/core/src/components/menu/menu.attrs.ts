import type { MenuOrientation, MenuTheme, MenuVariant } from "./menu.types";

export interface MenuAttrs {
	root: Record<string, string>;
	list: Record<string, string>;
	canvas: Record<string, string>;
	indicator: Record<string, string>;
	item(context: { id: string; active: boolean; disabled?: boolean }): Record<string, string>;
}

export function getMenuAttrs(context: {
	orientation: MenuOrientation;
	theme?: MenuTheme;
	variant?: MenuVariant;
}): MenuAttrs {
	const root: Record<string, string> = {
		"data-fluix-menu": "",
		"data-orientation": context.orientation,
	};

	if (context.theme) {
		root["data-theme"] = context.theme;
	}

	if (context.variant) {
		root["data-variant"] = context.variant;
	}

	return {
		root,
		list: {
			"data-fluix-menu-list": "",
		},
		canvas: {
			"data-fluix-menu-canvas": "",
		},
		indicator: {
			"data-fluix-menu-indicator": "",
		},
		item(itemContext) {
			const item: Record<string, string> = {
				"data-fluix-menu-item": "",
				"data-menu-id": itemContext.id,
				"data-state": itemContext.active ? "active" : "inactive",
			};

			if (itemContext.disabled) {
				item["data-disabled"] = "true";
			}

			return item;
		},
	};
}
