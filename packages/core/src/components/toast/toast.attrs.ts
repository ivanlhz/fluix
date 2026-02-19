/**
 * Toast DOM Attribute Contract.
 *
 * Maps toast state to data-attributes that CSS selectors target.
 * This is the bridge between core logic and styling.
 *
 * Every adapter must apply these attributes to the correct DOM elements
 * for the component to look and animate correctly.
 */

import type { FluixPosition, FluixToastItem, FluixToastLayout } from "./toast.types";

export interface ToastAttrs {
	viewport: Record<string, string>;
	root: Record<string, string>;
	canvas: Record<string, string>;
	header: Record<string, string>;
	badge: Record<string, string>;
	title: Record<string, string>;
	content: Record<string, string>;
	description: Record<string, string>;
	button: Record<string, string>;
}

type ExpandDirection = "top" | "bottom";
type PillAlign = "left" | "center" | "right";

function getPillAlign(position: FluixPosition): PillAlign {
	if (position.includes("right")) return "right";
	if (position.includes("center")) return "center";
	return "left";
}

function getExpandDirection(position: FluixPosition): ExpandDirection {
	return position.startsWith("top") ? "bottom" : "top";
}

/** Generate viewport container attributes for a position group. */
export function getViewportAttrs(
	position: FluixPosition,
	layout: FluixToastLayout = "stack",
): Record<string, string> {
	return {
		"data-fluix-viewport": "",
		"data-position": position,
		"data-layout": layout,
		"aria-live": "polite",
		role: "region",
	};
}

/** Generate all data-attributes for a single toast item. */
export function getToastAttrs(
	item: FluixToastItem,
	context: {
		ready: boolean;
		expanded: boolean;
	},
): ToastAttrs {
	const edge = getExpandDirection(item.position);
	const pillAlign = getPillAlign(item.position);

	return {
		viewport: getViewportAttrs(item.position),

		root: {
			"data-fluix-toast": "",
			"data-state": item.state,
			"data-theme": item.theme,
			"data-ready": String(context.ready),
			"data-expanded": String(context.expanded),
			"data-exiting": String(item.exiting),
			"data-edge": edge,
			"data-position": pillAlign,
		},

		canvas: {
			"data-fluix-canvas": "",
			"data-edge": edge,
		},

		header: {
			"data-fluix-header": "",
			"data-edge": edge,
		},

		badge: {
			"data-fluix-badge": "",
			"data-state": item.state,
		},

		title: {
			"data-fluix-title": "",
			"data-state": item.state,
		},

		content: {
			"data-fluix-content": "",
			"data-edge": edge,
			"data-visible": String(context.expanded),
		},

		description: {
			"data-fluix-description": "",
		},

		button: {
			"data-fluix-button": "",
			"data-state": item.state,
		},
	};
}
