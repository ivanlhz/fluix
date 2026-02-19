import type { FluixPosition, FluixToasterConfig } from "@fluix-ui/core";
import type { CSSProperties } from "react";

function resolveOffsetValue(value: number | string): string {
	return typeof value === "number" ? `${value}px` : value;
}

function resolveSides(offset: FluixToasterConfig["offset"]) {
	if (offset == null) return {};

	if (typeof offset === "number" || typeof offset === "string") {
		const value = resolveOffsetValue(offset);
		return { top: value, right: value, bottom: value, left: value };
	}

	const top = offset.top != null ? resolveOffsetValue(offset.top) : undefined;
	const right = offset.right != null ? resolveOffsetValue(offset.right) : undefined;
	const bottom = offset.bottom != null ? resolveOffsetValue(offset.bottom) : undefined;
	const left = offset.left != null ? resolveOffsetValue(offset.left) : undefined;

	return { top, right, bottom, left };
}

export function getViewportOffsetStyle(
	offset: FluixToasterConfig["offset"],
	position: FluixPosition,
): CSSProperties {
	const sides = resolveSides(offset);
	const style: CSSProperties = {};

	if (position.startsWith("top") && sides.top) style.top = sides.top;
	if (position.startsWith("bottom") && sides.bottom) style.bottom = sides.bottom;
	if (position.endsWith("right") && sides.right) style.right = sides.right;
	if (position.endsWith("left") && sides.left) style.left = sides.left;

	if (position.endsWith("center")) {
		if (sides.left) style.paddingLeft = sides.left;
		if (sides.right) style.paddingRight = sides.right;
	}

	return style;
}
