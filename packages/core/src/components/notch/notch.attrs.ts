/**
 * Notch DOM Attribute Contract.
 *
 * Maps notch state to data-attributes that CSS selectors target.
 */

import type { NotchPosition, NotchTheme } from "./notch.types";

export interface NotchAttrs {
	root: Record<string, string>;
	canvas: Record<string, string>;
	pill: Record<string, string>;
	content: Record<string, string>;
}

export function getNotchAttrs(context: {
	open: boolean;
	position: NotchPosition;
	theme?: NotchTheme;
}): NotchAttrs {
	const root: Record<string, string> = {
		"data-fluix-notch": "",
		"data-open": String(context.open),
		"data-position": context.position,
	};
	if (context.theme) {
		root["data-theme"] = context.theme;
	}

	return {
		root,
		canvas: {
			"data-fluix-notch-canvas": "",
		},
		pill: {
			"data-fluix-notch-pill": "",
		},
		content: {
			"data-fluix-notch-content": "",
			"data-open": String(context.open),
		},
	};
}
